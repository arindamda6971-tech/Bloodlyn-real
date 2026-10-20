package app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Keep notification icons and splash resources from being stripped by R8 / Proguard
    public static final int[] KEPT_RESOURCES = new int[] {
        R.drawable.ic_stat_bloodlyn,
        R.drawable.splash_icon,
        R.drawable.splash
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Enable edge-to-edge rendering so the WebView extends behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Guarantee Hardware Acceleration on the Window
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        // Refresh rate is deliberately left to the system. Forcing the panel's highest
        // mode (90/120Hz) made the WebView miss its ~8ms frame budget on most phones,
        // so slides judder between 120 and 60fps; Chrome avoids this by adapting itself.
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.setLayerType(View.LAYER_TYPE_NONE, null);

            WebSettings settings = webView.getSettings();
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            // Offscreen pre-raster is intentionally off: it only helps when the WebView
            // itself is moved on-screen, and otherwise rasters every tile of the page,
            // eating GPU memory the in-page slide transitions need.
        }
    }
}
