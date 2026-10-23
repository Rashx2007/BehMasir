function Read-BehMasirPfxPassword {
    Add-Type -AssemblyName PresentationFramework

    [xml]$layout = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" Title="BehMasir - PFX Password"
        Width="400" Height="210"
        WindowStartupLocation="CenterScreen"
        ResizeMode="NoResize" Topmost="True">
    <StackPanel Margin="20">
        <TextBlock Text="Enter the PFX password:" Margin="0,0,0,12"/>
        <PasswordBox Name="PasswordInput" Height="30"/>
        <StackPanel Orientation="Horizontal"
                    HorizontalAlignment="Right" Margin="0,20,0,0">
            <Button Name="StartButton" Content="Start"
                    Width="90" Height="30" IsDefault="True"/>
            <Button Name="CancelButton" Content="Cancel"
                    Width="90" Height="30" Margin="10,0,0,0"/>
        </StackPanel>
    </StackPanel>
</Window>
"@

    $reader = New-Object System.Xml.XmlNodeReader $layout
    try {
        $window = [System.Windows.Markup.XamlReader]::Load($reader)
    }
    finally {
        $reader.Close()
    }

    $inputBox = $window.FindName('PasswordInput')
    $startButton = $window.FindName('StartButton')
    $cancelButton = $window.FindName('CancelButton')

    $startButton.Add_Click({
        if ($inputBox.SecurePassword.Length -eq 0) {
            [System.Windows.MessageBox]::Show(
                'Please enter the PFX password.',
                'BehMasir'
            ) | Out-Null
            return
        }

        $window.Tag = $inputBox.SecurePassword.Copy()
        $window.Close()
    })

    $cancelButton.Add_Click({ $window.Close() })
    $window.Add_ContentRendered({ $inputBox.Focus() | Out-Null })

    $window.ShowDialog() | Out-Null
    $inputBox.Clear()
    return $window.Tag
}