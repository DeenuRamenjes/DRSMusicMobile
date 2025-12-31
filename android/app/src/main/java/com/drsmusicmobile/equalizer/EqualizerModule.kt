package com.drsmusicmobile.equalizer

import android.content.Context
import android.media.AudioManager
import android.media.audiofx.Equalizer
import android.util.Log
import com.facebook.react.bridge.*

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
            
            // If sessionId is 0, try to get a valid audio session from AudioManager
            audioSessionId = if (sessionId == 0) {
                val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                // Generate a new audio session ID
                audioManager.generateAudioSessionId()
            } else {
                sessionId
            }
            
            Log.d(TAG, "Attempting to initialize equalizer with session: $audioSessionId")
            
            // Try to create equalizer with priority 0 (normal priority)
            equalizer = try {
                Equalizer(0, audioSessionId)
            } catch (e: Exception) {
                Log.w(TAG, "Failed with generated session, trying with 0: ${e.message}")
                // Fallback: try with session 0 (global output mix - requires API 21+)
                try {
                    Equalizer(1000, 0) // Higher priority for global
                } catch (e2: Exception) {
                    Log.e(TAG, "All equalizer init attempts failed: ${e2.message}")
                    throw e2
                }
            }
            
            equalizer?.enabled = pendingEnabled
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

    override fun invalidate() {
        releaseInternal()
        super.invalidate()
    }
}
