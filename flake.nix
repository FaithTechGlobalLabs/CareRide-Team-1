{
  description = "CareRide development environment (Node, JDK 21, Android SDK)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs {
            inherit system;
            config = {
              allowUnfree = true;
              android_sdk.accept_license = true;
            };
          };
          # Capacitor 8 targets compile/target SDK 36. "latest" lets androidenv
          # pick versions that exist in this nixpkgs pin.
          android = pkgs.androidenv.composeAndroidPackages {
            platformVersions = [ "36" ];
            # AGP 8.13 still asks for 35; keep 36 for Capacitor 8 / compileSdk.
            buildToolsVersions = [
              "35.0.0"
              "36.0.0"
            ];
            includeEmulator = false;
            includeSources = false;
            includeSystemImages = false;
            includeCmake = false;
            extraLicenses = [
              "android-googletv-license"
              "android-sdk-arm-dbt-license"
              "android-sdk-license"
              "android-sdk-preview-license"
              "google-gdk-license"
              "intel-android-extra-license"
              "intel-android-sysimage-license"
              "mips-android-sysimage-license"
            ];
          };
          sdk = android.androidsdk;
          sdkRoot = "${sdk}/libexec/android-sdk";
          buildTools = "36.0.0";
          aapt2 = "${sdkRoot}/build-tools/${buildTools}/aapt2";
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_22
              pkgs.jdk21
              sdk
            ];
            ANDROID_HOME = sdkRoot;
            ANDROID_SDK_ROOT = sdkRoot;
            JAVA_HOME = pkgs.jdk21.home;
            GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${aapt2}";
            shellHook = ''
              export ANDROID_HOME=${sdkRoot}
              export ANDROID_SDK_ROOT=${sdkRoot}
              export JAVA_HOME=${pkgs.jdk21.home}
              export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
              # Gradle's downloaded aapt2 is dynamically linked and fails on NixOS.
              export GRADLE_OPTS="-Dorg.gradle.project.android.aapt2FromMavenOverride=${aapt2}"
            '';
          };
        }
      );
    };
}
