package com.reactrabbit

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.zip.ZipFile
import java.util.zip.ZipEntry
import org.json.JSONObject
import org.json.JSONArray

class AppCheckerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "AppChecker"
    }

    @ReactMethod
    fun getAppTechnologies(promise: Promise) {
        val pm = reactApplicationContext.packageManager
        val installedApps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        val appList = WritableNativeArray()

        for (app in installedApps) {
            try {
                val apkPath = app.sourceDir
                var isReactNative = false
                var isFlutter = false

                // Check for React Native
                try {
                    val zipFile = ZipFile(apkPath)
                    isReactNative = zipFile.getEntry("assets/index.android.bundle") != null ||
                                   zipFile.getEntry("assets/index.android.jsbundle") != null ||
                                   zipFile.getEntry("assets/bundle.js") != null ||
                                   zipFile.getEntry("assets/main.jsbundle") != null ||
                                   hasReactNativeSignature(zipFile)
                    zipFile.close()
                } catch (e: Exception) {
                    // Continue checking other methods
                }

                // Check for Flutter
                if (!isFlutter) {
                    try {
                        val zipFile = ZipFile(apkPath)
                        val entries = zipFile.entries()
                        while (entries.hasMoreElements() && !isFlutter) {
                            val entry = entries.nextElement()
                            if (entry.name.contains("lib/") && 
                                (entry.name.contains("libflutter.so") || entry.name.contains("libapp.so"))) {
                                isFlutter = true
                            }
                        }
                        if (!isFlutter) {
                            isFlutter = zipFile.getEntry("assets/flutter_assets/") != null ||
                                       zipFile.getEntry("assets/flutter_assets/kernel_blob.bin") != null ||
                                       zipFile.getEntry("assets/flutter_assets/AssetManifest.json") != null ||
                                       zipFile.getEntry("assets/flutter_assets/FontManifest.json") != null
                        }
                        zipFile.close()
                    } catch (e: Exception) {
                        // Continue
                    }
                }

                if (isReactNative || isFlutter) {
                    val appInfo = WritableNativeMap()
                    val label = pm.getApplicationLabel(app).toString()
                    
                    try {
                        val icon = pm.getApplicationIcon(app)
                        val iconBase64 = encodeDrawableToBase64(icon)
                        appInfo.putString("icon", iconBase64)
                    } catch (e: Exception) {
                        appInfo.putString("icon", "")
                    }

                    appInfo.putString("appName", label)
                    appInfo.putString("packageName", app.packageName)
                    appInfo.putString("tag", when {
                        isReactNative && isFlutter -> "React Native + Flutter"
                        isReactNative -> "React Native"
                        isFlutter -> "Flutter"
                        else -> "Unknown"
                    })

                    appList.pushMap(appInfo)
                }
            } catch (e: Exception) {
                // Skip on error
                android.util.Log.e("AppChecker", "Error checking app: ${app.packageName}", e)
            }
        }
        
        promise.resolve(appList)
    }

    private fun hasReactNativeSignature(zipFile: ZipFile): Boolean {
        try {
            val entries = zipFile.entries()
            while (entries.hasMoreElements()) {
                val entry = entries.nextElement()
                val name = entry.name.lowercase()
                if (name.contains("react") && name.contains("native") ||
                    name.contains("metro") ||
                    name.contains("jscexecutor") ||
                    name.contains("hermes")) {
                    return true
                }
            }
        } catch (e: Exception) {
            // Ignore
        }
        return false
    }

    @ReactMethod
    fun getAppPackages(packageName: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val app = pm.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
            val apkPath = app.sourceDir
            val zipFile = ZipFile(apkPath)
            
            val packagesList = WritableNativeArray()
            var foundPackages = false
            
            // Enhanced React Native package detection
            foundPackages = extractReactNativePackagesEnhanced(zipFile, packagesList) || foundPackages
            
            // Enhanced Flutter package detection
            foundPackages = extractFlutterPackagesEnhanced(zipFile, packagesList) || foundPackages
            
            // Extract native libraries
            extractNativeLibraries(zipFile, packagesList)
            
            zipFile.close()
            promise.resolve(packagesList)
            
        } catch (e: Exception) {
            android.util.Log.e("AppChecker", "Error getting packages for: $packageName", e)
            promise.reject("ERROR", "Failed to get packages: ${e.message}")
        }
    }

    private fun extractReactNativePackagesEnhanced(zipFile: ZipFile, packagesList: WritableNativeArray): Boolean {
        var foundPackages = false
        
        // Method 1: Look for package.json in various locations
        val packageJsonLocations = listOf(
            "assets/package.json",
            "assets/node_modules/package.json",
            "assets/react-native/package.json",
            "package.json"
        )
        
        for (location in packageJsonLocations) {
            val packageJsonEntry = findEntryInZip(zipFile, location)
            if (packageJsonEntry != null) {
                try {
                    extractReactNativePackagesFromJson(zipFile, packageJsonEntry, packagesList)
                    foundPackages = true
                } catch (e: Exception) {
                    android.util.Log.e("AppChecker", "Error parsing package.json at $location", e)
                }
            }
        }
        
        // Method 2: Analyze JavaScript bundle for module references
        val bundleLocations = listOf(
            "assets/index.android.bundle",
            "assets/index.android.jsbundle",
            "assets/main.jsbundle",
            "assets/bundle.js"
        )
        
        for (location in bundleLocations) {
            val bundleEntry = zipFile.getEntry(location)
            if (bundleEntry != null) {
                try {
                    extractPackagesFromBundle(zipFile, bundleEntry, packagesList)
                    foundPackages = true
                    break // Only analyze one bundle to avoid duplicates
                } catch (e: Exception) {
                    android.util.Log.e("AppChecker", "Error analyzing bundle at $location", e)
                }
            }
        }
        
        // Method 3: Check for common React Native library signatures
        foundPackages = detectReactNativeLibrariesFromStructure(zipFile, packagesList) || foundPackages
        
        return foundPackages
    }

    private fun extractReactNativePackagesFromJson(zipFile: ZipFile, packageJsonEntry: ZipEntry, packagesList: WritableNativeArray) {
        val inputStream = zipFile.getInputStream(packageJsonEntry)
        val packageJsonContent = inputStream.bufferedReader().use { it.readText() }
        val packageJson = JSONObject(packageJsonContent)
        
        // Get dependencies
        val dependencies = packageJson.optJSONObject("dependencies") ?: JSONObject()
        val devDependencies = packageJson.optJSONObject("devDependencies") ?: JSONObject()
        
        // Process dependencies
        processDependencies(dependencies, packagesList, "dependency")
        processDependencies(devDependencies, packagesList, "devDependency")
    }

    private fun processDependencies(deps: JSONObject, packagesList: WritableNativeArray, type: String) {
        val keys = deps.keys()
        while (keys.hasNext()) {
            val name = keys.next()
            val version = deps.getString(name)
            
            val packageInfo = WritableNativeMap()
            packageInfo.putString("name", name)
            packageInfo.putString("version", version)
            packageInfo.putString("type", "React Native Package ($type)")
            packageInfo.putString("source", "package.json")
            packageInfo.putString("url", "https://www.npmjs.com/package/$name")
            
            packagesList.pushMap(packageInfo)
        }
    }

    private fun extractPackagesFromBundle(zipFile: ZipFile, bundleEntry: ZipEntry, packagesList: WritableNativeArray) {
        val inputStream = zipFile.getInputStream(bundleEntry)
        val bundleContent = inputStream.bufferedReader().use { it.readText() }
        
        // Enhanced regex patterns for module detection
        val patterns = listOf(
            // Standard require statements
            """require\(['"]([^'"]+)['"]\)""".toRegex(),
            // Module registry
            """__d\(function\([^)]*\)\s*\{\s*["']([^"']+)["']""".toRegex(),
            // Import statements
            """import\s+.*\s+from\s+['"]([^'"]+)['"]""".toRegex(),
            // Metro bundler module definitions
            """__r\((\d+)\)""".toRegex()
        )
        
        val foundModules = mutableSetOf<String>()
        
        for (pattern in patterns) {
            val matches = pattern.findAll(bundleContent)
            for (match in matches) {
                val moduleName = match.groupValues[1]
                
                // Filter for actual npm packages
                if (isValidNpmPackage(moduleName)) {
                    val cleanName = cleanModuleName(moduleName)
                    foundModules.add(cleanName)
                }
            }
        }
        
        // Add found modules to packages list
        for (moduleName in foundModules) {
            val packageInfo = WritableNativeMap()
            packageInfo.putString("name", moduleName)
            packageInfo.putString("type", "React Native Package (detected from bundle)")
            packageInfo.putString("source", "bundle analysis")
            packageInfo.putString("url", "https://www.npmjs.com/package/$moduleName")
            packagesList.pushMap(packageInfo)
        }
    }

    private fun isValidNpmPackage(moduleName: String): Boolean {
        return moduleName.isNotEmpty() &&
               !moduleName.startsWith("./") &&
               !moduleName.startsWith("../") &&
               !moduleName.startsWith("/") &&
               !moduleName.contains("\\") &&
               moduleName != "react" &&
               moduleName != "react-native" &&
               (moduleName.startsWith("@") || !moduleName.contains("/") || moduleName.startsWith("react-native-"))
    }

    private fun cleanModuleName(moduleName: String): String {
        return when {
            moduleName.startsWith("node_modules/") -> {
                val parts = moduleName.removePrefix("node_modules/").split("/")
                if (parts[0].startsWith("@")) {
                    "${parts[0]}/${parts.getOrNull(1) ?: ""}"
                } else {
                    parts[0]
                }
            }
            else -> moduleName.split("/")[0]
        }
    }

    private fun detectReactNativeLibrariesFromStructure(zipFile: ZipFile, packagesList: WritableNativeArray): Boolean {
        var found = false
        val entries = zipFile.entries()
        val detectedLibs = mutableSetOf<String>()
        
        while (entries.hasMoreElements()) {
            val entry = entries.nextElement()
            val name = entry.name.lowercase()
            
            // Check for common React Native library patterns
            when {
                name.contains("react-native-") -> {
                    val libName = extractLibraryName(name, "react-native-")
                    if (libName.isNotEmpty()) detectedLibs.add("react-native-$libName")
                }
                name.contains("@react-native") -> {
                    val libName = extractLibraryName(name, "@react-native")
                    if (libName.isNotEmpty()) detectedLibs.add("@react-native$libName")
                }
            }
        }
        
        for (lib in detectedLibs) {
            val packageInfo = WritableNativeMap()
            packageInfo.putString("name", lib)
            packageInfo.putString("type", "React Native Package (detected from structure)")
            packageInfo.putString("source", "APK structure analysis")
            packageInfo.putString("url", "https://www.npmjs.com/package/$lib")
            packagesList.pushMap(packageInfo)
            found = true
        }
        
        return found
    }

    private fun extractLibraryName(path: String, prefix: String): String {
        return try {
            val startIndex = path.indexOf(prefix)
            if (startIndex >= 0) {
                val afterPrefix = path.substring(startIndex + prefix.length)
                val parts = afterPrefix.split("/", "\\")
                if (parts.isNotEmpty() && parts[0].isNotBlank()) {
                    parts[0].replace("-", "-").trim()
                } else ""
            } else ""
        } catch (e: Exception) {
            ""
        }
    }

    private fun extractFlutterPackagesEnhanced(zipFile: ZipFile, packagesList: WritableNativeArray): Boolean {
        var foundPackages = false
        
        // Method 1: Look for pubspec.yaml in various locations
        val pubspecLocations = listOf(
            "assets/flutter_assets/pubspec.yaml",
            "assets/pubspec.yaml",
            "pubspec.yaml",
            "flutter_assets/pubspec.yaml"
        )
        
        for (location in pubspecLocations) {
            val pubspecEntry = findEntryInZip(zipFile, location)
            if (pubspecEntry != null) {
                try {
                    extractFlutterPackagesFromPubspec(zipFile, pubspecEntry, packagesList)
                    foundPackages = true
                } catch (e: Exception) {
                    android.util.Log.e("AppChecker", "Error parsing pubspec.yaml at $location", e)
                }
            }
        }
        
        // Method 2: Analyze AssetManifest.json for package references
        foundPackages = extractFlutterPackagesFromAssetManifest(zipFile, packagesList) || foundPackages
        
        // Method 3: Check for package signatures in flutter_assets
        foundPackages = detectFlutterPackagesFromAssets(zipFile, packagesList) || foundPackages
        
        return foundPackages
    }

    private fun extractFlutterPackagesFromPubspec(zipFile: ZipFile, pubspecEntry: ZipEntry, packagesList: WritableNativeArray) {
        val inputStream = zipFile.getInputStream(pubspecEntry)
        val pubspecContent = inputStream.bufferedReader().use { it.readText() }
        
        // Parse YAML content (simplified)
        val lines = pubspecContent.split("\n")
        var inDependenciesSection = false
        var inDevDependenciesSection = false
        var currentIndentLevel = 0
        
        for (line in lines) {
            val trimmedLine = line.trim()
            val leadingSpaces = line.length - line.trimStart().length
            
            when {
                trimmedLine.startsWith("dependencies:") -> {
                    inDependenciesSection = true
                    inDevDependenciesSection = false
                    currentIndentLevel = leadingSpaces
                }
                trimmedLine.startsWith("dev_dependencies:") -> {
                    inDependenciesSection = false
                    inDevDependenciesSection = true
                    currentIndentLevel = leadingSpaces
                }
                trimmedLine.startsWith("flutter:") -> {
                    inDependenciesSection = false
                    inDevDependenciesSection = false
                }
                (inDependenciesSection || inDevDependenciesSection) && 
                trimmedLine.contains(":") && 
                leadingSpaces > currentIndentLevel -> {
                    
                    val parts = trimmedLine.split(":", limit = 2)
                    if (parts.size >= 2) {
                        val packageName = parts[0].trim()
                        var version = parts[1].trim()
                        
                        // Skip flutter SDK packages
                        if (packageName in listOf("flutter", "flutter_test", "sdk")) continue
                        
                        // Clean version string
                        version = version.replace(Regex("[^\\d.]"), "").ifEmpty { "unknown" }
                        
                        val packageInfo = WritableNativeMap()
                        packageInfo.putString("name", packageName)
                        packageInfo.putString("version", version)
                        packageInfo.putString("type", if (inDependenciesSection) "Flutter Package" else "Flutter Dev Package")
                        packageInfo.putString("source", "pubspec.yaml")
                        packageInfo.putString("url", "https://pub.dev/packages/$packageName")
                        
                        packagesList.pushMap(packageInfo)
                    }
                }
                leadingSpaces <= currentIndentLevel && trimmedLine.isNotEmpty() -> {
                    inDependenciesSection = false
                    inDevDependenciesSection = false
                }
            }
        }
    }

    private fun extractFlutterPackagesFromAssetManifest(zipFile: ZipFile, packagesList: WritableNativeArray): Boolean {
        val assetManifest = zipFile.getEntry("assets/flutter_assets/AssetManifest.json")
        if (assetManifest != null) {
            try {
                val inputStream = zipFile.getInputStream(assetManifest)
                val manifestContent = inputStream.bufferedReader().use { it.readText() }
                
                val jsonObject = JSONObject(manifestContent)
                val keys = jsonObject.keys()
                val foundPackages = mutableSetOf<String>()
                
                while (keys.hasNext()) {
                    val key = keys.next()
                    if (key.startsWith("packages/")) {
                        val packageName = key.split("/")[1]
                        if (packageName.isNotEmpty()) {
                            foundPackages.add(packageName)
                        }
                    }
                }
                
                for (pkg in foundPackages) {
                    val packageInfo = WritableNativeMap()
                    packageInfo.putString("name", pkg)
                    packageInfo.putString("type", "Flutter Package (detected from assets)")
                    packageInfo.putString("source", "AssetManifest.json")
                    packageInfo.putString("url", "https://pub.dev/packages/$pkg")
                    packagesList.pushMap(packageInfo)
                }
                
                return foundPackages.isNotEmpty()
            } catch (e: Exception) {
                android.util.Log.e("AppChecker", "Error parsing AssetManifest.json", e)
            }
        }
        return false
    }

    private fun detectFlutterPackagesFromAssets(zipFile: ZipFile, packagesList: WritableNativeArray): Boolean {
        var found = false
        val entries = zipFile.entries()
        val packageNames = mutableSetOf<String>()
        
        while (entries.hasMoreElements()) {
            val entry = entries.nextElement()
            val name = entry.name
            
            // Look for package-specific assets
            if (name.startsWith("assets/flutter_assets/packages/")) {
                val parts = name.split("/")
                if (parts.size > 3) {
                    val packageName = parts[3]
                    if (packageName.isNotEmpty()) {
                        packageNames.add(packageName)
                    }
                }
            }
        }
        
        for (packageName in packageNames) {
            val packageInfo = WritableNativeMap()
            packageInfo.putString("name", packageName)
            packageInfo.putString("type", "Flutter Package (detected from assets)")
            packageInfo.putString("source", "flutter_assets structure")
            packageInfo.putString("url", "https://pub.dev/packages/$packageName")
            packagesList.pushMap(packageInfo)
            found = true
        }
        
        return found
    }

    private fun findEntryInZip(zipFile: ZipFile, entryName: String): ZipEntry? {
        val entries = zipFile.entries()
        while (entries.hasMoreElements()) {
            val entry = entries.nextElement()
            if (entry.name.equals(entryName, ignoreCase = true)) {
                return entry
            }
        }
        return null
    }

    private fun extractNativeLibraries(zipFile: ZipFile, packagesList: WritableNativeArray) {
        try {
            val entries = zipFile.entries()
            val nativeLibs = mutableSetOf<String>()
            
            while (entries.hasMoreElements()) {
                val entry = entries.nextElement()
                if (entry.name.startsWith("lib/") && entry.name.endsWith(".so")) {
                    val libName = entry.name.substringAfterLast("/")
                    nativeLibs.add(libName)
                }
            }
            
            for (lib in nativeLibs) {
                val packageInfo = WritableNativeMap()
                packageInfo.putString("name", lib)
                packageInfo.putString("type", "Native Library")
                packageInfo.putString("source", "APK lib directory")
                
                // Try to find more info about the library
                val libInfo = when {
                    lib.contains("jsc") -> "JavaScriptCore (React Native)"
                    lib.contains("v8") -> "V8 JavaScript Engine"
                    lib.contains("hermes") -> "Hermes Engine (React Native)"
                    lib.contains("flutter") -> "Flutter Engine"
                    lib.contains("reactnativejni") -> "React Native JNI"
                    lib.contains("yoga") -> "Yoga Layout Engine (React Native)"
                    else -> "Native Library"
                }
                packageInfo.putString("description", libInfo)
                
                packagesList.pushMap(packageInfo)
            }
        } catch (e: Exception) {
            android.util.Log.e("AppChecker", "Error extracting native libraries", e)
        }
    }

    private fun encodeDrawableToBase64(drawable: Drawable): String {
        val bitmap = Bitmap.createBitmap(
            drawable.intrinsicWidth.coerceAtLeast(1),
            drawable.intrinsicHeight.coerceAtLeast(1),
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)

        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
        val byteArray = outputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.NO_WRAP)
    }
}