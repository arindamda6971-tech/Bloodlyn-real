package app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Enable edge-to-edge rendering so the WebView extends behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            // CRITICAL FOR 60/120 FPS:
            // Do NOT use LAYER_TYPE_HARDWARE on the Android View level.
            // LAYER_TYPE_HARDWARE forces an offscreen double-buffering pass in Java memory.
            // LAYER_TYPE_NONE lets Chromium's internal GPU rasterization pipeline draw
            // directly to the hardware surface (identically to standalone Chrome).
            webView.setLayerType(View.LAYER_TYPE_NONE, null);

            WebSettings settings = webView.getSettings();
            settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
        }
    }
}
