package app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.util.Locale;

public class MainActivity extends BridgeActivity {

    // Keep notification icons and splash resources from being stripped by R8 / Proguard
    public static final int[] KEPT_RESOURCES = new int[] {
        R.drawable.ic_stat_bloodlyn,
        R.drawable.splash_icon,
        R.drawable.splash
    };

    // Height of the status bar and the bottom navigation/gesture bar, in CSS pixels.
    private int insetTopDp = 0;
    private int insetBottomDp = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Enable edge-to-edge rendering so the WebView extends behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // The page draws behind both system bars on every Android version, but
        // Capacitor only reports their size to it on Android 15+, and older
        // WebViews report env(safe-area-inset-*) as 0. Without this, buttons at
        // the bottom sit under the back/home/recents keys on older phones.
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            float density = getResources().getDisplayMetrics().density;
            insetTopDp = Math.round(bars.top / density);
            // With the keyboard up, the keyboard covers the bar, so nothing needs lifting.
            insetBottomDp = insets.isVisible(WindowInsetsCompat.Type.ime()) ? 0 : Math.round(bars.bottom / density);
            pushInsetsToPage();
            return ViewCompat.onApplyWindowInsets(view, insets);
        });
        if (getBridge() != null) {
            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public void onPageLoaded(WebView webView) {
                    pushInsetsToPage();
                }
            });
        }

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

    /** Hands the bar sizes to the page as --native-inset-top / --native-inset-bottom. */
    private void pushInsetsToPage() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView webView = getBridge().getWebView();
        String script = String.format(
            Locale.US,
            "try{var s=document.documentElement.style;s.setProperty('--native-inset-top','%dpx');s.setProperty('--native-inset-bottom','%dpx');}catch(e){}",
            insetTopDp,
            insetBottomDp
        );
        webView.post(() -> webView.evaluateJavascript(script, null));
    }
}
