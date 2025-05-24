// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "Ussd", // This should match your module name, often the same as your project
    platforms: [
        .iOS(.v14) // Matching the deployment target we set
    ],
    products: [
        .library(
            name: "Ussd",
            targets: ["Ussd"])
    ],
    dependencies: [
        // No external dependencies for the library itself at this point.
        // React Native will be linked by the consuming application.
    ],
    targets: [
        .target(
            name: "Ussd",
            dependencies: [], // No external SPM dependencies for this target
            path: ".", // Assumes sources are in the root of the 'ios' directory or subdirectories
            sources: ["."], // Specify source files, e.g., ["Ussd.swift"] or ["."] for all valid sources
            publicHeadersPath: nil // No public headers needed if it's a pure Swift module or uses a bridging header internally
        )
    ]
)
