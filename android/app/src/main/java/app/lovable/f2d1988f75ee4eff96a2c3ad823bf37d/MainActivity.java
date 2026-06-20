package app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // Force maximum refresh rate (120Hz/90Hz) if available on device
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Use a safer way to get Display context
                WindowManager windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
                if (windowManager != null) {
                    Display display = windowManager.getDefaultDisplay();
                    WindowManager.LayoutParams layoutParams = getWindow().getAttributes();
                    Display.Mode[] modes = display.getSupportedModes();
                    
                    float highestRate = 60f;
                    int bestModeId = -1;
                    
                    for (Display.Mode mode : modes) {
                        if (mode.getRefreshRate() > highestRate) {
                            highestRate = mode.getRefreshRate();
                            bestModeId = mode.getModeId();
                        }
                    }
                    
                    if (bestModeId != -1) {
                        layoutParams.preferredDisplayModeId = bestModeId;
                        getWindow().setAttributes(layoutParams);
                    }
                }
            } else {
                // Older legacy way for 120Hz support (Android 6.0+)
                WindowManager.LayoutParams layoutParams = getWindow().getAttributes();
                layoutParams.preferredRefreshRate = 0; // Requests highest available
                getWindow().setAttributes(layoutParams);
            }
        } catch (Exception e) {
            // Log or ignore if hardware doesn't support refresh rate overrides
        }
    }
}
