package com.drsmusicmobile.equalizer

import android.content.Context
import android.media.AudioManager
import android.media.audiofx.Equalizer
import android.util.Log
import com.facebook.react.bridge.*
import android.os.Build

class EqualizerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var equalizer: Equalizer? = null
    private var audioSessionId: Int = 0
    private var isInitialized = false
    private val TAG = "EqualizerModule"
    
    // Store band levels to apply when equalizer is initialized
    private var pendingBandLevels: IntArray? = null
    private var pendingEnabled: Boolean = false

    override fun getName(): String = "EqualizerModule"

    @ReactMethod
    fun initialize(sessionId: Int, promise: Promise) {
        try {
            // Release any existing equalizer
            releaseInternal()
            
            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            // Strategy: Try multiple approaches to get a working equalizer
            // Priority 0 = normal apps, Priority 1000 = system/higher priority
            
            val sessionIdsToTry = mutableListOf<Pair<Int, Int>>() // Pair<sessionId, priority>
            
            // 1. If a specific session was provided, try it first
            if (sessionId > 0) {
                sessionIdsToTry.add(Pair(sessionId, 0))
            }
            
            // 2. Try session 0 with high priority (system-wide output mix)
            // This applies to all audio output on the device
            sessionIdsToTry.add(Pair(0, 1000))
            sessionIdsToTry.add(Pair(0, 0))
            
            // 3. Generate a new session ID and try
            val generatedSession = audioManager.generateAudioSessionId()
            sessionIdsToTry.add(Pair(generatedSession, 0))
            
            var lastError: Exception? = null
            
            for ((trySessionId, priority) in sessionIdsToTry) {
                try {
                    Log.d(TAG, "Trying to create equalizer with session: $trySessionId, priority: $priority")
                    equalizer = Equalizer(priority, trySessionId)
                    audioSessionId = trySessionId
                    equalizer?.enabled = true // Enable immediately to verify it works
                    equalizer?.enabled = pendingEnabled
                    
                    Log.d(TAG, "SUCCESS: Equalizer created with session: $trySessionId")
                    break
                } catch (e: Exception) {
                    Log.w(TAG, "Failed with session $trySessionId, priority $priority: ${e.message}")
                    lastError = e
                    equalizer = null
                }
            }
            
            if (equalizer == null) {
                Log.e(TAG, "All equalizer initialization attempts failed")
                throw lastError ?: Exception("Failed to create equalizer")
            }
            
            isInitialized = true
            
            // Apply any pending band levels
            pendingBandLevels?.let { levels ->
                applyBandLevels(levels)
                pendingBandLevels = null
            }
            
            val numberOfBands = equalizer?.numberOfBands?.toInt() ?: 0
            val bandInfo = Arguments.createArray()
            
            for (i in 0 until numberOfBands) {
                val band = Arguments.createMap()
                val freqRange = equalizer?.getBandFreqRange(i.toShort())
                val centerFreq = equalizer?.getCenterFreq(i.toShort()) ?: 0
                
                band.putInt("band", i)
                band.putInt("centerFreq", centerFreq / 1000)
                band.putInt("minFreq", (freqRange?.get(0) ?: 0) / 1000)
                band.putInt("maxFreq", (freqRange?.get(1) ?: 0) / 1000)
                bandInfo.pushMap(band)
            }
            
            val levelRange = equalizer?.bandLevelRange
            val result = Arguments.createMap()
            result.putInt("numberOfBands", numberOfBands)
            result.putArray("bands", bandInfo)
            result.putInt("minLevel", levelRange?.get(0)?.toInt() ?: -1500)
            result.putInt("maxLevel", levelRange?.get(1)?.toInt() ?: 1500)
            result.putInt("numberOfPresets", equalizer?.numberOfPresets?.toInt() ?: 0)
            result.putInt("audioSessionId", audioSessionId)
            
            Log.d(TAG, "Equalizer initialized with $numberOfBands bands for session $audioSessionId")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize equalizer: ${e.message}")
            isInitialized = false
            // Don't reject - just return null so app continues without EQ
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun setEnabled(enabled: Boolean, promise: Promise) {
        try {
            pendingEnabled = enabled
            if (isInitialized && equalizer != null) {
                equalizer?.enabled = enabled
                Log.d(TAG, "Equalizer enabled: $enabled")
            } else {
                Log.d(TAG, "Equalizer not initialized, storing enabled state: $enabled")
            }
            promise.resolve(enabled)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set enabled: ${e.message}")
            promise.resolve(enabled) // Don't reject, just log
        }
    }

    private fun applyBandLevels(levels: IntArray) {
        val numberOfBands = equalizer?.numberOfBands?.toInt() ?: 0
        val levelRange = equalizer?.bandLevelRange
        val minLevel = levelRange?.get(0) ?: -1500
        val maxLevel = levelRange?.get(1) ?: 1500
        
        for (i in 0 until minOf(levels.size, numberOfBands)) {
            val clampedLevel = levels[i].coerceIn(minLevel.toInt(), maxLevel.toInt()).toShort()
            equalizer?.setBandLevel(i.toShort(), clampedLevel)
            Log.d(TAG, "Applied band $i level: $clampedLevel")
        }
    }

    @ReactMethod
    fun setBandLevel(band: Int, level: Int, promise: Promise) {
        try {
            if (!isInitialized || equalizer == null) {
                Log.d(TAG, "Equalizer not initialized, cannot set band level")
                promise.resolve(level)
                return
            }
            
            val levelRange = equalizer?.bandLevelRange
            val minLevel = levelRange?.get(0) ?: -1500
            val maxLevel = levelRange?.get(1) ?: 1500
            val clampedLevel = level.coerceIn(minLevel.toInt(), maxLevel.toInt()).toShort()
            
            equalizer?.setBandLevel(band.toShort(), clampedLevel)
            Log.d(TAG, "Set band $band level to $clampedLevel")
            promise.resolve(clampedLevel.toInt())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set band level: ${e.message}")
            promise.resolve(level)
        }
    }

    @ReactMethod
    fun setAllBands(levels: ReadableArray, promise: Promise) {
        try {
            val levelsArray = IntArray(levels.size()) { levels.getInt(it) }
            
            if (!isInitialized || equalizer == null) {
                // Store for later when equalizer is initialized
                pendingBandLevels = levelsArray
                Log.d(TAG, "Equalizer not initialized, storing band levels for later")
                promise.resolve(true)
                return
            }
            
            applyBandLevels(levelsArray)
            Log.d(TAG, "Set all bands: ${levelsArray.toList()}")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set all bands: ${e.message}")
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun getPresets(promise: Promise) {
        try {
            val presets = Arguments.createArray()
            if (!isInitialized || equalizer == null) {
                promise.resolve(presets)
                return
            }
            
            val numberOfPresets = equalizer?.numberOfPresets?.toInt() ?: 0
            
            for (i in 0 until numberOfPresets) {
                val preset = Arguments.createMap()
                preset.putInt("index", i)
                preset.putString("name", equalizer?.getPresetName(i.toShort()) ?: "Preset $i")
                presets.pushMap(preset)
            }
            
            promise.resolve(presets)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get presets: ${e.message}")
            promise.resolve(Arguments.createArray())
        }
    }

    @ReactMethod
    fun setPreset(presetIndex: Int, promise: Promise) {
        try {
            if (!isInitialized || equalizer == null) {
                Log.d(TAG, "Equalizer not initialized, cannot set preset")
                promise.resolve(true)
                return
            }
            
            equalizer?.usePreset(presetIndex.toShort())
            Log.d(TAG, "Set preset: $presetIndex")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set preset: ${e.message}")
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun release(promise: Promise) {
        releaseInternal()
        promise.resolve(true)
    }
    
    private fun releaseInternal() {
        try {
            equalizer?.release()
            equalizer = null
            isInitialized = false
            audioSessionId = 0
            Log.d(TAG, "Equalizer released")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to release: ${e.message}")
        }
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(true)
    }
    
    // Check if equalizer is currently working
    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            val result = Arguments.createMap()
            result.putBoolean("isInitialized", isInitialized)
            result.putInt("audioSessionId", audioSessionId)
            result.putBoolean("isEnabled", equalizer?.enabled ?: false)
            result.putInt("numberOfBands", equalizer?.numberOfBands?.toInt() ?: 0)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    override fun invalidate() {
        releaseInternal()
        super.invalidate()
    }
}
