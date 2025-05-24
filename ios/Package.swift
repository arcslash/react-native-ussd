// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "Ussd",
    platforms: [
        .iOS(.v14)
    ],
    products: [
        .library(
            name: "Ussd",
            targets: ["Ussd"])
    ],
    dependencies: [
        // Add React Native as a dependency if you need to test interactions with React types.
        // However, for testing Ussd.swift in isolation, we might not need it here
        // if we can mock the RCTBridgeModule aspects.
        // For now, let's assume we mock what's needed from React.
    ],
    targets: [
        .target(
            name: "Ussd",
            dependencies: [],
            path: ".", // Assumes sources are in the root of the 'ios' directory
            sources: ["Ussd.swift"] // Explicitly list sources
        ),
        .testTarget(
            name: "UssdTests",
            dependencies: ["Ussd"], // Depends on the main Ussd target
            path: "Tests/UssdTests" // Specify path for test files
        )
    ]
)
