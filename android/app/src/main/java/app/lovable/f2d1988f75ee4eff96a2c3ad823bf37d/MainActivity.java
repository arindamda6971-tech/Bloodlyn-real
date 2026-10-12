package app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;
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

        // Guarantee Hardware Acceleration on the Window
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        // Unlock 90Hz / 120Hz display refresh rate
        // By default Android OS throttles WebViews to 60Hz. Setting preferred display mode unlocks full panel speed.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Display display = getDisplay();
            if (display != null) {
                Display.Mode[] modes = display.getSupportedModes();
                Display.Mode maxMode = null;
                for (Display.Mode mode : modes) {
                    if (maxMode == null || mode.getRefreshRate() > maxMode.getRefreshRate()) {
                        maxMode = mode;
                    }
                }
                if (maxMode != null) {
                    WindowManager.LayoutParams params = getWindow().getAttributes();
                    params.preferredDisplayModeId = maxMode.getModeId();
                    getWindow().setAttributes(params);
                }
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.preferredRefreshRate = 120.0f;
            getWindow().setAttributes(params);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.setLayerType(View.LAYER_TYPE_NONE, null);

            WebSettings settings = webView.getSettings();
            settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            // Pre-raster offscreen contents so sliding page transitions are pre-rendered without frame drops
            settings.setOffscreenPreRaster(true);
        }
    }
}
