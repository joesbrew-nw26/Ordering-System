import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // High-Priority Audio Session for Kitchen Order Notifications over Bluetooth
        configureAudioSession()
        return true
    }

    private func configureAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            // .playback category ensures audio plays even if silent switch is on or other media is playing
            // .duckOthers lowers background music volume so KDS notification cuts through with high priority!
            // .mixWithOthers allows playing simultaneously without killing background music app
            // .allowBluetooth & .allowBluetoothA2DP routes audio through connected Bluetooth speakers
            try session.setCategory(
                .playback,
                mode: .default,
                options: [.duckOthers, .mixWithOthers, .allowBluetooth, .allowBluetoothA2DP]
            )
            try session.setActive(true, options: [])
            print("[KDS Audio] AVAudioSession successfully configured for Bluetooth ducking and high priority playback.")
        } catch {
            print("[KDS Audio] Failed to configure AVAudioSession: \(error)")
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Re-prime audio session when returning to foreground
        configureAudioSession()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Re-prime audio session when active
        configureAudioSession()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
