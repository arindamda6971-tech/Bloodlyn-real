package app.lovable.f2d1988f75ee4eff96a2c3ad823bf37d;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Tells the app whether this build can receive call alerts. Only a build made with
 * android/app/google-services.json has Firebase Cloud Messaging set up (the Google
 * Services plugin then adds the google_app_id string). Asking for a push token in a
 * build without it throws inside the push plugin and closes the app, so the app asks
 * here first and simply does without alerts.
 */
@CapacitorPlugin(name = "PushSetup")
public class PushSetupPlugin extends Plugin {

    @PluginMethod
    public void isReady(PluginCall call) {
        Context context = getContext();
        int id = context.getResources().getIdentifier("google_app_id", "string", context.getPackageName());
        JSObject result = new JSObject();
        result.put("ready", id != 0);
        call.resolve(result);
    }
}
