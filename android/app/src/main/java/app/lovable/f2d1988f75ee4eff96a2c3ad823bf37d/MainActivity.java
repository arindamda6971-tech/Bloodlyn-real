package app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d;

import android.os.Bundle;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.graphics.Insets;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge rendering so the WebView extends behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Listen for window insets and inject them as CSS custom properties
        // so that web CSS can use them as fallbacks for env(safe-area-inset-*)
        ViewCompat.setOnApplyWindowInsetsListener(
            getWindow().getDecorView(), (v, insets) -> {
                Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                float density = getResources().getDisplayMetrics().density;
                int top = Math.round(systemBars.top / density);
                int bottom = Math.round(systemBars.bottom / density);
                int left = Math.round(systemBars.left / density);
                int right = Math.round(systemBars.right / density);

                // Inject into WebView once the bridge is ready
                if (getBridge() != null && getBridge().getWebView() != null) {
                    android.webkit.WebView webView = getBridge().getWebView();

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
}
