#include "pch.h"

#include "App.h"

#include "AutolinkedNativeModules.g.h"
#include "ReactPackageProvider.h"

using namespace winrt::test1;
using namespace winrt::test1::implementation;
using namespace winrt;
using namespace Windows::UI::Xaml;
using namespace Windows::UI::Xaml::Controls;
using namespace Windows::UI::Xaml::Navigation;
using namespace Windows::ApplicationModel;

/// <summary>
/// Initializes the singleton application object.  This is the first line of
/// authored code executed, and as such is the logical equivalent of main() or
/// WinMain().
/// </summary>
App::App() noexcept
{
    // Set UseBundle to true in BuildFlags.props when creating appxs
#if BUNDLE
    JavaScriptBundleFile(L"index.windows");
    InstanceSettings().UseWebDebugger(false);
    InstanceSettings().UseFastRefresh(false);
    InstanceSettings().UseDeveloperSupport(false);
#else
    // If the V8 inspector is enabled, we also support fast refresh in release builds
    JavaScriptMainModuleName(L"index");
    InstanceSettings().UseWebDebugger(false); // BabylonReactNative accesses the jsi runtime, which isn't possible with the web debugger
    InstanceSettings().UseFastRefresh(true);
    InstanceSettings().SourceBundleHost(L"192.168.0.10"); // Update to PC ip address when running on remote machines (HoloLens 2)
    InstanceSettings().UseDirectDebugger(true);
    InstanceSettings().DebuggerPort(4653);
    InstanceSettings().UseDeveloperSupport(true);
#endif

    RegisterAutolinkedNativeModulePackages(PackageProviders()); // Includes any autolinked modules

    PackageProviders().Append(make<ReactPackageProvider>()); // Includes all modules in this project

    InitializeComponent();
}

/// <summary>
/// Invoked when the application is launched normally by the end user.  Other entry points
/// will be used such as when the application is launched to open a specific file.
/// </summary>
/// <param name="e">Details about the launch request and process.</param>
void App::OnLaunched(activation::LaunchActivatedEventArgs const& e)
{
    super::OnLaunched(e);

    Frame rootFrame = Window::Current().Content().as<Frame>();
    rootFrame.Navigate(xaml_typename<test1::MainPage>(), box_value(e.Arguments()));
}

/// <summary>
/// Invoked when application execution is being suspended.  Application state is saved
/// without knowing whether the application will be terminated or resumed with the contents
/// of memory still intact.
/// </summary>
/// <param name="sender">The source of the suspend request.</param>
/// <param name="e">Details about the suspend request.</param>
void App::OnSuspending([[maybe_unused]] IInspectable const& sender, [[maybe_unused]] SuspendingEventArgs const& e)
{
    // Save application state and stop any background activity
}

/// <summary>
/// Invoked when Navigation to a certain page fails
/// </summary>
/// <param name="sender">The Frame which failed navigation</param>
/// <param name="e">Details about the navigation failure</param>
void App::OnNavigationFailed(IInspectable const&, NavigationFailedEventArgs const& e)
{
    throw hresult_error(E_FAIL, hstring(L"Failed to load Page ") + e.SourcePageType().Name);
}
