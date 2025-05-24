package com.isharaux.ussd

import android.content.Context
import android.os.Handler
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import io.mockk.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLog

// Using Robolectric to provide a more complete Android environment for tests
// This helps with things like Looper.getMainLooper() and Context
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [Config.OLDEST_SDK]) // Adjust SDK as needed
class UssdModuleTest {

    private lateinit var mockReactContext: ReactApplicationContext
    private lateinit var mockTelephonyManager: TelephonyManager
    private lateinit var mockSubscriptionManager: TelephonyManager // For createForSubscriptionId
    private lateinit var mockEmitter: RCTDeviceEventEmitter
    private lateinit var ussdModule: UssdModule

    @Before
    fun setUp() {
        // Initialize Robolectric's ShadowLog to capture Android logs
        ShadowLog.stream = System.out

        mockReactContext = mockk(relaxed = true)
        mockTelephonyManager = mockk(relaxed = true)
        mockSubscriptionManager = mockk(relaxed = true) // Mock for the result of createForSubscriptionId
        mockEmitter = mockk(relaxed = true)

        // Mock getSystemService
        every { mockReactContext.getSystemService(Context.TELEPHONY_SERVICE) } returns mockTelephonyManager
        // Mock createForSubscriptionId. Assuming SubscriptionManager.getDefaultSubscriptionId() returns a valid int.
        every { mockTelephonyManager.createForSubscriptionId(any()) } returns mockSubscriptionManager

        // Mock the JS module emitter
        every { mockReactContext.getJSModule(RCTDeviceEventEmitter::class.java) } returns mockEmitter

        // Mock Arguments.createMap()
        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() } // Use JavaOnlyMap for testing

        ussdModule = UssdModule(mockReactContext)
    }

    @After
    fun tearDown() {
        unmockkAll() // Clear all mocks after each test
    }

    @Test
    fun `dial sends USSD request and handles success`() {
        val testCode = "*123#"
        val mockResponse = "Your balance is 10 USD"

        // Capture the callback
        val callbackSlot = slot<TelephonyManager.UssdResponseCallback>()
        every {
            mockSubscriptionManager.sendUssdRequest(
                eq(testCode),
                capture(callbackSlot),
                any<Handler>()
            )
        } just runs

        ussdModule.dial(testCode)

        // Verify sendUssdRequest was called
        verify {
            mockSubscriptionManager.sendUssdRequest(
                eq(testCode),
                any<TelephonyManager.UssdResponseCallback>(),
                any<Handler>()
            )
        }

        // Trigger the success callback
        callbackSlot.captured.onReceiveUssdResponse(mockSubscriptionManager, testCode, mockResponse)

        // Verify event was sent
        val expectedParams = JavaOnlyMap()
        expectedParams.putString("ussdReply", mockResponse)
        verify { mockEmitter.emit("ussdEvent", match { params -> params.toString() == expectedParams.toString() }) }
    }

    @Test
    fun `dial handles USSD failure`() {
        val testCode = "*123#"
        val failureCode = TelephonyManager.USSD_RETURN_FAILURE // Example failure code

        val callbackSlot = slot<TelephonyManager.UssdResponseCallback>()
        every {
            mockSubscriptionManager.sendUssdRequest(
                eq(testCode),
                capture(callbackSlot),
                any<Handler>()
            )
        } just runs

        ussdModule.dial(testCode)

        // Trigger the failure callback
        callbackSlot.captured.onReceiveUssdResponseFailed(mockSubscriptionManager, testCode, failureCode)

        // Verify that an error was logged (or an event sent, if that were the desired behavior)
        // For now, we're just checking if an error log might have occurred.
        // Exact log verification can be tricky with default Log behavior in unit tests without specific setup.
        // However, we ensure no crash and the callback is processed.
        // If specific error events were sent to JS, we would verify that here.
        // In the current UssdModule, failure is only logged via Log.e.
    }

    @Test
    fun `dial handles exception during USSD request`() {
        val testCode = "*123#"
        every { mockReactContext.getSystemService(Context.TELEPHONY_SERVICE) } throws RuntimeException("Test Exception")

        ussdModule.dial(testCode)

        // Verify that sendUssdRequest was not called due to the earlier exception
        verify(exactly = 0) {
            mockSubscriptionManager.sendUssdRequest(any(), any(), any())
        }
        // Verify error logging (as above, direct Log verification is complex here, but we ensure no crash)
    }

    @Test
    fun `getName returns correct module name`() {
        assert(ussdModule.name == "Ussd")
    }
}
