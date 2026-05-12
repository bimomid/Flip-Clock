use serde::{Deserialize, Serialize};
use std::env;
use tauri::AppHandle;
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReleaseInfo {
    pub latest_version: String,
    pub release_url: String,
    pub download_url: String,
    pub portable_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    html_url: String,
    assets: Vec<GitHubAsset>,
}

#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}

struct AssetPair {
    installer: Option<String>,
    portable: Option<String>,
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn is_portable() -> bool {
    // 1. Explicit .portable marker file
    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            if dir.join(".portable").exists() {
                return true;
            }
        }
    }

    // 2. If installed via NSIS/MSI, there will be an uninstall registry key
    if has_uninstall_entry() {
        return false;
    }

    // 3. No marker and no registry → portable (dev build or truly portable)
    true
}

#[cfg(target_os = "windows")]
fn has_uninstall_entry() -> bool {
    std::process::Command::new("reg")
        .args([
            "query",
            r"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Uninstall\com.kavie.flip-clock",
            "/ve",
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[cfg(not(target_os = "windows"))]
fn has_uninstall_entry() -> bool {
    false
}

fn normalize_semver(v: &str) -> String {
    let (base, suffix) = match v.split_once('-') {
        Some((b, s)) => (b, format!("-{}", s)),
        None => (v, String::new()),
    };
    let parts: Vec<&str> = base.split('.').collect();
    match parts.len() {
        1 => format!("{}.0.0{}", parts[0], suffix),
        2 => format!("{}.{}.0{}", parts[0], parts[1], suffix),
        _ => v.to_string(),
    }
}

#[tauri::command]
pub async fn check_for_updates() -> Result<Option<ReleaseInfo>, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/repos/bimomid/Flip-Clock/releases/latest")
        .header(
            "User-Agent",
            format!("flip-clock/{}", env!("CARGO_PKG_VERSION")),
        )
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch releases: {}", e))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }

    if !response.status().is_success() {
        return Err(format!("GitHub API returned status: {}", response.status()));
    }

    let release: GitHubRelease = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse release: {}", e))?;

    let tag = release.tag_name.strip_prefix('v').unwrap_or(&release.tag_name);
    let tag = normalize_semver(tag);
    let latest = semver::Version::parse(&tag)
        .map_err(|e| format!("Failed to parse latest version '{}': {}", tag, e))?;
    let current = semver::Version::parse(&normalize_semver(env!("CARGO_PKG_VERSION")))
        .map_err(|e| format!("Failed to parse current version: {}", e))?;

    if latest <= current {
        return Ok(None);
    }

    let pair = pick_assets(&release.assets)?;

    Ok(Some(ReleaseInfo {
        latest_version: latest.to_string(),
        release_url: release.html_url,
        download_url: pair.installer.ok_or("No installer found in release assets")?,
        portable_url: pair.portable,
    }))
}

fn pick_assets(assets: &[GitHubAsset]) -> Result<AssetPair, String> {
    let os = env::consts::OS;
    let arch = env::consts::ARCH;

    match os {
        "windows" => {
            let setup_pattern = if arch == "x86_64" || arch == "x86" {
                "x64-setup.exe"
            } else {
                "setup.exe"
            };

            let installer = assets
                .iter()
                .find(|a| a.name.contains(setup_pattern))
                .or_else(|| assets.iter().find(|a| a.name.ends_with(".msi")))
                .map(|a| a.browser_download_url.clone());

            let portable = assets
                .iter()
                .find(|a| {
                    let n = a.name.to_lowercase();
                    (n.contains("portable") || n.contains("no-installer"))
                        && n.ends_with(".exe")
                })
                .map(|a| a.browser_download_url.clone());

            Ok(AssetPair { installer, portable })
        }
        "android" => {
            let apk = assets
                .iter()
                .find(|a| a.name.ends_with(".apk"))
                .map(|a| a.browser_download_url.clone());

            Ok(AssetPair {
                installer: apk,
                portable: None,
            })
        }
        other => Err(format!("Unsupported platform: {}", other)),
    }
}

fn downloads_dir() -> Result<std::path::PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let profile = env::var("USERPROFILE")
            .map_err(|_| "Cannot find USERPROFILE".to_string())?;
        Ok(std::path::PathBuf::from(profile).join("Downloads"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let home = env::var("HOME")
            .map_err(|_| "Cannot find HOME directory".to_string())?;
        Ok(std::path::PathBuf::from(home).join("Downloads"))
    }
}

async fn do_download(
    asset_url: &str,
    save_dir: &std::path::Path,
    app_handle: &AppHandle,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut response = client
        .get(asset_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download: {}", e))?;

    let total = response.content_length().unwrap_or(0);
    let filename = asset_url
        .split('/')
        .last()
        .unwrap_or("update.exe")
        .to_string();

    std::fs::create_dir_all(save_dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let filepath = save_dir.join(&filename);
    let mut file = std::fs::File::create(&filepath)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    use std::io::Write;
    let mut downloaded: u64 = 0;

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Download error: {}", e))?
    {
        file.write_all(&chunk)
            .map_err(|e| format!("Write error: {}", e))?;
        downloaded += chunk.len() as u64;

        let _ = app_handle.emit(
            "update-download-progress",
            DownloadProgress {
                downloaded,
                total,
            },
        );
    }

    Ok(filepath.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn download_update(asset_url: String, app_handle: AppHandle) -> Result<String, String> {
    let temp_dir = env::temp_dir().join("flip-clock-update");
    do_download(&asset_url, &temp_dir, &app_handle).await
}

#[tauri::command]
pub async fn download_to_downloads(
    asset_url: String,
    app_handle: AppHandle,
) -> Result<String, String> {
    let dir = downloads_dir()?;
    do_download(&asset_url, &dir, &app_handle).await
}

#[tauri::command]
pub fn install_update(installer_path: String, app_handle: AppHandle) -> Result<(), String> {
    match env::consts::OS {
        "windows" => {
            std::process::Command::new(&installer_path)
                .arg("/S")
                .spawn()
                .map_err(|e| format!("Failed to start installer: {}", e))?;
        }
        "android" => {
            return Err("Use Android intent to install APK".into());
        }
        other => return Err(format!("Unsupported platform for install: {}", other)),
    }

    app_handle.exit(0);
    Ok(())
}
