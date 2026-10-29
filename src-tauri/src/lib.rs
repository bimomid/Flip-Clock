use std::time::Duration;

#[tauri::command]
fn prevent_sleep() {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows_sys::Win32::System::Power::{
            SetThreadExecutionState, ES_CONTINUOUS, ES_DISPLAY_REQUIRED, ES_SYSTEM_REQUIRED,
        };
        SetThreadExecutionState(ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED);
    }
}

const RELEASES_PAGE: &str = "https://github.com/bimomid/Flip-Clock/releases/latest";
const LATEST_JSON_URL: &str =
    "https://github.com/bimomid/Flip-Clock/releases/latest/download/latest.json";
/// 与 latest.json 相同的发布信息，但走 API 域名：Android 上 release 资源 CDN 常被丢包。
const RELEASE_API_URL: &str = "https://api.github.com/repos/bimomid/Flip-Clock/releases/latest";
const RELEASES_PREFIX: &str = "https://github.com/bimomid/Flip-Clock";
/// 移动网络下 TCP 连接可能被黑洞（SYN 直接丢弃），没有超时就会永远停在“正在检查更新…”。
const CONNECT_TIMEOUT: Duration = Duration::from_secs(6);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
const USER_AGENT: &str = concat!("FlipClock/", env!("CARGO_PKG_VERSION"));

/// 供移动端使用的更新检查：先读 GitHub API，失败再读 Release 上的 latest.json。
/// 桌面端由 tauri-plugin-updater 负责自动更新，这里主要用于 Android。
#[derive(serde::Serialize)]
struct LatestRelease {
    version: String,
    notes: String,
    page: String,
}

/// reqwest 会在错误里重复整条 URL，弹窗只需要域名与原因。
fn strip_url(message: &str) -> String {
    match message.find(" for url (") {
        Some(idx) => message[..idx].to_string(),
        None => message.to_string(),
    }
}

/// 把 reqwest 的错误链拼成一行，便于在界面里定位（DNS / TLS / 代理等）。
fn describe_error(err: &(dyn std::error::Error + 'static)) -> String {
    let mut parts = vec![strip_url(&err.to_string())];
    let mut source = err.source();
    while let Some(cause) = source {
        parts.push(strip_url(&cause.to_string()));
        source = cause.source();
    }
    parts.join(": ")
}

/// 更新检查必须带超时：Android 上 GitHub 的 CDN 域名经常直接丢包，
/// 没有连接/整体超时就会一直停在“正在检查更新…”，用户看到的是永远转圈。
fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .user_agent(USER_AGENT)
        .build()
        .map_err(|err| format!("client init failed: {}", describe_error(&err)))
}

/// 报错只带域名，避免把整条长 URL 塞进弹窗。
fn host_of(url: &str) -> &str {
    url.split("://")
        .nth(1)
        .and_then(|rest| rest.split('/').next())
        .unwrap_or(url)
}

async fn fetch_json(
    client: &reqwest::Client,
    url: &str,
    accept: &str,
) -> Result<serde_json::Value, String> {
    let response = client
        .get(url)
        .header("accept", accept)
        .send()
        .await
        .map_err(|err| format!("{}: {}", host_of(url), describe_error(&err)))?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("{}: unexpected status {status}", host_of(url)));
    }
    let body = response
        .text()
        .await
        .map_err(|err| format!("{}: read failed: {}", host_of(url), describe_error(&err)))?;
    serde_json::from_str(&body).map_err(|err| format!("{}: invalid json: {err}", host_of(url)))
}

fn from_manifest(manifest: &serde_json::Value) -> LatestRelease {
    LatestRelease {
        version: manifest
            .get("version")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        notes: manifest
            .get("notes")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        page: RELEASES_PAGE.to_string(),
    }
}

fn from_api(release: &serde_json::Value) -> Result<LatestRelease, String> {
    let tag = release
        .get("tag_name")
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    let version = tag.trim_start_matches('v');
    if version.is_empty() {
        return Err("api.github.com: release has no tag_name".to_string());
    }
    Ok(LatestRelease {
        version: version.to_string(),
        notes: release
            .get("body")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        page: RELEASES_PAGE.to_string(),
    })
}

/// 先问 GitHub API（不经过 release 资源 CDN），失败再读 latest.json；
/// 两条路都失败时把各自的错误一起返回，界面才能告诉用户到底卡在哪。
#[tauri::command]
async fn fetch_latest_release() -> Result<LatestRelease, String> {
    let client = http_client()?;
    let mut errors = Vec::new();

    match fetch_json(&client, RELEASE_API_URL, "application/vnd.github+json").await {
        Ok(json) => match from_api(&json) {
            Ok(release) => return Ok(release),
            Err(err) => errors.push(err),
        },
        Err(err) => errors.push(err),
    }

    match fetch_json(&client, LATEST_JSON_URL, "application/json").await {
        Ok(json) => return Ok(from_manifest(&json)),
        Err(err) => errors.push(err),
    }

    Err(errors.join(" | "))
}

/// 用系统浏览器打开发布页（Android 上无法静默自安装 APK，只能引导用户手动安装）。
#[tauri::command]
fn open_release_page(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    if !url.starts_with(RELEASES_PREFIX) {
        return Err("unsupported url".into());
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            prevent_sleep,
            fetch_latest_release,
            open_release_page
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::net::TcpListener;
    use std::time::Instant;

    #[test]
    fn api_release_drops_tag_prefix() {
        let json: serde_json::Value = serde_json::json!({
            "tag_name": "v1.2.3",
            "body": "- fix: something"
        });
        let release = from_api(&json).expect("api release should parse");
        assert_eq!(release.version, "1.2.3");
        assert_eq!(release.notes, "- fix: something");
        assert_eq!(release.page, RELEASES_PAGE);
    }

    #[test]
    fn api_release_without_tag_is_an_error() {
        let json: serde_json::Value = serde_json::json!({ "body": "no tag" });
        let err = match from_api(&json) {
            Ok(_) => panic!("missing tag must fail"),
            Err(err) => err,
        };
        assert!(err.contains("api.github.com"), "{err}");
    }

    #[test]
    fn manifest_maps_version_and_notes() {
        let json: serde_json::Value = serde_json::json!({
            "version": "1.0.0",
            "notes": "## 更新内容",
            "platforms": {}
        });
        let release = from_manifest(&json);
        assert_eq!(release.version, "1.0.0");
        assert_eq!(release.notes, "## 更新内容");
    }

    #[test]
    fn strip_url_drops_the_repeated_url() {
        let raw = "error sending request for url (https://api.github.com/x): boom";
        assert_eq!(strip_url(raw), "error sending request");
        assert_eq!(strip_url("plain message"), "plain message");
    }

    #[test]
    fn host_of_keeps_only_the_host() {
        assert_eq!(host_of("https://api.github.com/repos/x"), "api.github.com");
        assert_eq!(host_of("not a url"), "not a url");
    }

    /// 复现移动网络的“SYN 黑洞”：TCP 连得上但永远没有响应。
    /// 没有超时的话这里会永久挂起，也就是界面上永远停在“正在检查更新…”。
    #[test]
    fn fetch_json_gives_up_when_the_server_never_answers() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind listener");
        let addr = listener.local_addr().expect("local addr");
        let _server = std::thread::spawn(move || {
            if let Ok((mut socket, _)) = listener.accept() {
                std::thread::sleep(Duration::from_secs(5));
                let _ = socket.write_all(b"/");
            }
        });

        let client = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(1))
            .timeout(Duration::from_millis(400))
            .build()
            .expect("build client");
        let url = format!("http://{addr}/latest.json");
        let started = Instant::now();
        let result = tauri::async_runtime::block_on(fetch_json(&client, &url, "application/json"));
        let elapsed = started.elapsed();

        let err = match result {
            Ok(_) => panic!("a silent server must fail, not hang"),
            Err(err) => err,
        };
        assert!(
            err.contains(&addr.to_string()),
            "error should name the host: {err}"
        );
        assert!(
            elapsed < Duration::from_secs(4),
            "took too long: {elapsed:?}"
        );
    }
}
