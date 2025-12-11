package com.drsmusicmobile

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }

  // Fix for Android 14+ broadcast receiver requirement
  override fun registerReceiver(receiver: BroadcastReceiver?, filter: IntentFilter?): Intent? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      super.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
    } else {
      super.registerReceiver(receiver, filter)
    }
  }

  override fun registerReceiver(
    receiver: BroadcastReceiver?,
    filter: IntentFilter?,
    flags: Int
  ): Intent? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && flags == 0) {
      super.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
    } else {
      super.registerReceiver(receiver, filter, flags)
    }
  }
}
