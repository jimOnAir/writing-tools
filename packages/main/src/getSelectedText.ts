import { execSync } from 'child_process';
import os from 'os';

export function getSelectedText(): string | null {
  try {
    const platform = os.platform();

    if (platform === 'win32') {
      const command = `
        Add-Type -AssemblyName UIAutomationClient;
        $f=[System.Windows.Automation.AutomationElement]::FocusedElement;
        if ($f -ne $null) {
          $p=$f.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern);
          if ($p -ne $null) {
            $r=$p.GetSelection()[0];
            if ($r -ne $null) { $r.GetText(-1) }
          }
        }
      `.replace(/\n/g, ' ');
      const result = execSync(`powershell -Command "${command}"`, { encoding: 'utf8' });

      return result.trim() || null;
    }

    if (platform === 'darwin') {
      const script = `
        tell application "System Events"
          set frontApp to first process whose frontmost is true
          try
            get value of attribute "AXSelectedText" of UI element 1 of frontApp
          on error
            return ""
          end try
        end tell
      `.trim();
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });

      return result.trim() || null;
    }

    if (platform === 'linux') {
      const result = execSync('xclip -o -selection primary', { encoding: 'utf8' });

      return result.trim() || null;
    }

    return null;
  } catch {
    return null;
  }
}
