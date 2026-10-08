using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: System.Reflection.AssemblyTitle("狮子街传说")]
[assembly: System.Reflection.AssemblyProduct("狮子街传说 · 试玩版")]
[assembly: System.Reflection.AssemblyVersion("0.5.0.0")]
internal static class Program {
    internal static string Arg(string[] args, string name) {
        int i = Array.IndexOf(args, name);
        return i >= 0 && i + 1 < args.Length ? Path.GetFullPath(args[i + 1]) : null;
    }
    [STAThread] static int Main(string[] args) {
        if (Array.IndexOf(args, "--check-runtime") >= 0) {
            try { CoreWebView2Environment.GetAvailableBrowserVersionString(); return 0; }
            catch { return 2; }
        }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        string profile = Arg(args, "--test-profile") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LeoStreetLegend", "WebView2");
        bool created;
        // Test profiles are explicitly isolated from the player's saves.
        using (var mutex = new Mutex(true, "Local\\LeoStreetLegend-" + (Arg(args, "--test-profile") == null ? "Player" : "QA"), out created)) {
            if (!created) { MessageBox.Show("游戏已经打开，请从任务栏切换到游戏窗口。", "狮子街传说"); return 0; }
            using (var window = new GameWindow(profile, Arg(args, "--test-script"), Arg(args, "--test-output"))) Application.Run(window);
        }
        return Environment.ExitCode;
    }
}

internal sealed class GameWindow : Form {
    const string Origin = "https://leostreet.example";
    readonly WebView2 view = new WebView2();
    readonly string profile, testScript, testOutput;
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 10000000 };
    readonly List<object> checks = new List<object>();
    bool closing, testStarted;

    public GameWindow(string profile, string testScript, string testOutput) {
        this.profile = profile; this.testScript = testScript; this.testOutput = testOutput;
        Text = "狮子街传说 · 试玩版";
        ClientSize = new Size(1360, 860); MinimumSize = new Size(980, 680);
        StartPosition = FormStartPosition.CenterScreen; BackColor = Color.FromArgb(16, 25, 31);
        WindowState = FormWindowState.Maximized;
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        view.Dock = DockStyle.Fill; view.DefaultBackgroundColor = BackColor; Controls.Add(view);
        Shown += async delegate { await Initialize(); };
        FormClosing += async delegate(object sender, FormClosingEventArgs e) {
            if (closing || view.CoreWebView2 == null) return;
            e.Cancel = true; closing = true;
            try { await view.ExecuteScriptAsync("window.dispatchEvent(new Event('pagehide'));"); await Task.Delay(150); } catch { }
            Close();
        };
        KeyPreview = true;
        KeyDown += delegate(object s, KeyEventArgs e) { if (e.KeyCode == Keys.F11) { ToggleFullScreen(); e.Handled = true; } };
    }

    void ToggleFullScreen() {
        if (FormBorderStyle == FormBorderStyle.None) { FormBorderStyle = FormBorderStyle.Sizable; WindowState = FormWindowState.Normal; }
        else { FormBorderStyle = FormBorderStyle.None; WindowState = FormWindowState.Maximized; }
    }

    async Task Initialize() {
        try {
            string web = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web");
            if (!File.Exists(Path.Combine(web, "index.html"))) throw new IOException("游戏文件不完整，请重新运行安装包。");
            var environment = await CoreWebView2Environment.CreateAsync(null, profile);
            await view.EnsureCoreWebView2Async(environment);
            view.CoreWebView2.SetVirtualHostNameToFolderMapping("leostreet.example", web, CoreWebView2HostResourceAccessKind.DenyCors);
            view.CoreWebView2.Settings.AreDevToolsEnabled = testScript != null;
            view.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            view.CoreWebView2.Settings.IsStatusBarEnabled = false;
            view.CoreWebView2.Settings.IsWebMessageEnabled = false;
            view.CoreWebView2.NavigationStarting += delegate(object s, CoreWebView2NavigationStartingEventArgs e) {
                Uri uri;
                if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out uri) || uri.Scheme != "https" || uri.Host != "leostreet.example") e.Cancel = true;
            };
            view.CoreWebView2.NewWindowRequested += delegate(object s, CoreWebView2NewWindowRequestedEventArgs e) {
                e.Handled = true; Uri uri;
                if (e.IsUserInitiated && Uri.TryCreate(e.Uri, UriKind.Absolute, out uri) && (uri.Scheme == "https" || uri.Scheme == "http"))
                    Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
            };
            view.CoreWebView2.PermissionRequested += delegate(object s, CoreWebView2PermissionRequestedEventArgs e) { e.State = CoreWebView2PermissionState.Deny; };
            view.CoreWebView2.DownloadStarting += delegate(object s, CoreWebView2DownloadStartingEventArgs e) { e.Cancel = true; };
            if (testScript != null) {
                if (testOutput == null) throw new ArgumentException("--test-output is required with --test-script");
                Directory.CreateDirectory(testOutput);
                await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync("window.__qaErrors=[]; window.addEventListener('error',e=>{if(e.message)window.__qaErrors.push(e.message)}); window.addEventListener('unhandledrejection',e=>window.__qaErrors.push(String(e.reason))); window.qaClick=t=>{const b=[...document.querySelectorAll('button')].find(b=>!b.disabled&&b.textContent.includes(t));if(!b)throw Error('Missing button: '+t);b.click();};");
                view.CoreWebView2.NavigationCompleted += async delegate(object s, CoreWebView2NavigationCompletedEventArgs e) {
                    if (testStarted) return; testStarted = true;
                    File.WriteAllText(Path.Combine(testOutput, "navigation.json"), json.Serialize(new { success = e.IsSuccess, error = e.WebErrorStatus.ToString(), status = e.HttpStatusCode, source = view.Source.ToString() }));
                    await RunTest(e.IsSuccess);
                };
            }
            view.CoreWebView2.Navigate(Origin + "/index.html");
        } catch (Exception error) {
            if (testOutput != null) { Directory.CreateDirectory(testOutput); File.WriteAllText(Path.Combine(testOutput, "fatal.txt"), error.ToString()); Environment.ExitCode = 1; Close(); }
            else { MessageBox.Show("无法启动游戏。请重新运行安装包，确认 Microsoft Edge WebView2 已安装。\n\n" + error.Message, "狮子街传说", MessageBoxButtons.OK, MessageBoxIcon.Error); Close(); }
        }
    }

    async Task RunTest(bool loaded) {
        try {
            if (!loaded) throw new Exception("Navigation failed");
            await Task.Delay(1800);
            var steps = json.Deserialize<List<Dictionary<string, object>>>(File.ReadAllText(testScript));
            foreach (var step in steps) {
                if (step.ContainsKey("offline")) {
                    await view.CoreWebView2.CallDevToolsProtocolMethodAsync("Network.enable", "{}");
                    await view.CoreWebView2.CallDevToolsProtocolMethodAsync("Network.emulateNetworkConditions", "{\"offline\":true,\"latency\":0,\"downloadThroughput\":-1,\"uploadThroughput\":-1}");
                    view.CoreWebView2.Reload();
                    await Task.Delay(1800);
                }
                if (step.ContainsKey("wait")) await Task.Delay(Convert.ToInt32(step["wait"]));
                if (step.ContainsKey("js")) {
                    string script = "(()=>{try{return {ok:true,value:(()=>{" + (string)step["js"] + "})()}}catch(e){return {ok:false,error:String(e)}}})()";
                    string result = await view.ExecuteScriptAsync(script);
                    var parsed = json.Deserialize<Dictionary<string, object>>(result);
                    checks.Add(new { name = step.ContainsKey("name") ? step["name"] : "step", result = parsed });
                    if (!(bool)parsed["ok"]) throw new Exception(result);
                }
                if (step.ContainsKey("screenshot")) using (var file = File.Create(Path.Combine(testOutput, Path.GetFileName((string)step["screenshot"]))))
                    await view.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, file);
            }
            string errors = await view.ExecuteScriptAsync("window.__qaErrors");
            if (errors != "[]") throw new Exception("Browser errors: " + errors);
            File.WriteAllText(Path.Combine(testOutput, "result.json"), json.Serialize(new { ok = true, runtime = view.CoreWebView2.Environment.BrowserVersionString, executable = Application.ExecutablePath, checks = checks, browserErrors = errors }));
        } catch (Exception error) {
            Environment.ExitCode = 1;
            File.WriteAllText(Path.Combine(testOutput, "result.json"), json.Serialize(new { ok = false, error = error.ToString(), checks = checks }));
        }
        Close();
    }
}
