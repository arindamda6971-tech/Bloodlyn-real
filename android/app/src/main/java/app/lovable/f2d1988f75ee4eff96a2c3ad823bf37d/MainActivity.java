package app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.graphics.Insets;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private int lastTop = -1;
    private int lastBottom = -1;
    private int lastLeft = -1;
    private int lastRight = -1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge rendering so the WebView extends behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Listen for window insets and inject them as CSS custom properties
        ViewCompat.setOnApplyWindowInsetsListener(
            getWindow().getDecorView(), (v, insets) -> {
                Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                float density = getResources().getDisplayMetrics().density;
                int top = Math.round(systemBars.top / density);
                int bottom = Math.round(systemBars.bottom / density);
                int left = Math.round(systemBars.left / density);
                int right = Math.round(systemBars.right / density);

                // Prevent spamming evaluateJavascript on every touch/scroll event if insets haven't changed
                if (top == lastTop && bottom == lastBottom && left == lastLeft && right == lastRight) {
                    return WindowInsetsCompat.CONSUMED;
                }
                lastTop = top;
                lastBottom = bottom;
                lastLeft = left;
                lastRight = right;

                // Inject into WebView once the bridge is ready
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView webView = getBridge().getWebView();

                    String js = "document.documentElement.style.setProperty('--safe-area-inset-top','" + top + "px');"
                        + "document.documentElement.style.setProperty('--safe-area-inset-bottom','" + bottom + "px');"
                        + "document.documentElement.style.setProperty('--safe-area-inset-left','" + left + "px');"
                        + "document.documentElement.style.setProperty('--safe-area-inset-right','" + right + "px');";
                    webView.post(() ->
                        webView.evaluateJavascript(js, null)
                    );
                }

                return WindowInsetsCompat.CONSUMED;
            }
        );
    }

    @Override
    public void onStart() {
        super.onStart();
        // Hardware acceleration & 60/120fps WebView compositor optimization
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            WebSettings settings = webView.getSettings();
            settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setOffscreenPreRaster(true);
        }
    }
}
