use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Register CapsLock as the global Push-to-Talk hotkey
            app.global_shortcut().on_shortcut("capslock", move |_app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    let _ = handle.emit("global-ptt", true);
                } else {
                    let _ = handle.emit("global-ptt", false);
                }
            })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
