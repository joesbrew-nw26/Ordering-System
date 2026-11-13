package com.joesbrew.kds;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.SoundPool;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "JoesBrewKDS_Native";
    private static final String CHANNEL_ID = "joes_brew_kds_orders";
    private static final int NOTIFICATION_ID = 2006;
    private static final int PERMISSION_REQUEST_POST_NOTIFICATIONS = 101;

    private SoundPool soundPool;
    private int soundGround = 0;
    private int soundTerrace = 0;
    private int soundRunner = 0;

    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        initSoundPool();
        createNotificationChannel();
        initWakeLock();

        // Configure WebView settings to allow background playback and add the native bridge
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                webView.addJavascriptInterface(new AndroidAudioBridge(), "AndroidAudioBridge");
                Log.i(TAG, "AndroidAudioBridge successfully injected into WebView");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error configuring WebView bridge: " + e.getMessage(), e);
        }

        // Request POST_NOTIFICATIONS on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                        PERMISSION_REQUEST_POST_NOTIFICATIONS);
            }
        }
    }

    private void initSoundPool() {
        try {
            // USAGE_ALARM guarantees that Android OS will NOT duck or mute audio when minimized or screen locked!
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                    .build();

            soundPool = new SoundPool.Builder()
                    .setMaxStreams(4)
                    .setAudioAttributes(audioAttributes)
                    .build();

            soundGround = soundPool.load(this, R.raw.chime_ground, 1);
            soundTerrace = soundPool.load(this, R.raw.chime_terrace, 1);
            soundRunner = soundPool.load(this, R.raw.chime_runner, 1);

            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            Log.i(TAG, "SoundPool initialized with ALARM attributes & loaded chimes");
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize SoundPool: " + e.getMessage(), e);
        }
    }

    private void initWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "JoesBrewKDS:AudioWakeLock");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "WakeLock init failed: " + e.getMessage(), e);
        }
    }

    private void acquireTransientWakeLock(long durationMs) {
        try {
            if (wakeLock != null) {
                if (wakeLock.isHeld()) {
                    wakeLock.release();
                }
                wakeLock.acquire(durationMs);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not acquire WakeLock: " + e.getMessage());
        }
    }

    private void requestTransientAudioFocus() {
        try {
            if (audioManager == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();

                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(false)
                        .setOnAudioFocusChangeListener(focusChange -> {})
                        .build();

                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
            }
        } catch (Exception e) {
            Log.w(TAG, "AudioFocus request failed: " + e.getMessage());
        }
    }

    private void triggerVibration(long[] pattern) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vibratorManager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vibratorManager != null) {
                    Vibrator vibrator = vibratorManager.getDefaultVibrator();
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                }
            } else {
                Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                    } else {
                        vibrator.vibrate(pattern, -1);
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Vibration failed: " + e.getMessage());
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Joe's Brew Kitchen Alerts";
            String description = "High-priority audible order & waiter notifications for KDS";
            int importance = NotificationManager.IMPORTANCE_HIGH;

            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 100, 250});
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void showHeadsUpNotification(String title, String body) {
        try {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) return;

            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0));

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true);

            notificationManager.notify(NOTIFICATION_ID, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Failed to display notification: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (soundPool != null) {
            soundPool.release();
            soundPool = null;
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    /**
     * Native JavaScript Bridge exposed to the KDS Web App via window.AndroidAudioBridge
     */
    public class AndroidAudioBridge {

        @JavascriptInterface
        public boolean isNativeBridgeAvailable() {
            return true;
        }

        @JavascriptInterface
        public void playNotification(boolean isTerrace, String title, String body) {
            runOnUiThread(() -> {
                try {
                    acquireTransientWakeLock(4000);
                    requestTransientAudioFocus();

                    // Play native high-importance chime at 100% volume
                    int soundId = isTerrace ? soundTerrace : soundGround;
                    if (soundPool != null && soundId != 0) {
                        soundPool.play(soundId, 1.0f, 1.0f, 1, 0, 1.0f);
                    }

                    // Physical vibration alert
                    triggerVibration(isTerrace ? new long[]{0, 250, 100, 300, 100, 350} : new long[]{0, 200, 100, 250});

                    // Heads-up notification
                    String notifTitle = (title != null && !title.isEmpty()) ? title :
                            (isTerrace ? "⚡ Terrace Table Alert!" : "🔔 New Kitchen Order!");
                    String notifBody = (body != null && !body.isEmpty()) ? body :
                            "A new customer order has arrived in Joe's Brew KDS.";
                    showHeadsUpNotification(notifTitle, notifBody);

                    Log.i(TAG, "Played native order chime. Terrace=" + isTerrace + ", title=" + notifTitle);
                } catch (Exception e) {
                    Log.e(TAG, "Error in native playNotification: " + e.getMessage(), e);
                }
            });
        }

        @JavascriptInterface
        public void playRunnerAlert() {
            runOnUiThread(() -> {
                try {
                    acquireTransientWakeLock(3000);
                    if (soundPool != null && soundRunner != 0) {
                        soundPool.play(soundRunner, 1.0f, 1.0f, 1, 0, 1.0f);
                    }
                    triggerVibration(new long[]{0, 150, 100, 200});
                } catch (Exception e) {
                    Log.e(TAG, "Error in native playRunnerAlert: " + e.getMessage(), e);
                }
            });
        }

        @JavascriptInterface
        public void vibrateAlert() {
            runOnUiThread(() -> triggerVibration(new long[]{0, 200, 100, 200}));
        }
    }
}
