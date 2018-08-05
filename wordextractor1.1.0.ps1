$root_dir = "C:\Users\Dave\Desktop\davidbrowning.github.io\history"
New-Variable -Name wdFormatHTML -Value 10 -Option Constant
$default = [Type]::Missing


function done(){
  $word.ActiveDocument.Close();
  $word.Quit();
  write-host "Done"
  exit
  end
}

get-process | Where-Object Name -Like "*Word*" | kill
#done
# files in root directory
cd $root_dir
<#
get-childitem -recurse "*htmlout*" | remove-item -recurse -force
foreach ($file in $(get-childitem *.doc*)) # had to also change to .doc in retrospect, should have used *.doc*
{
 Write-Host $file; 


$word = New-Object -comobject Word.Application
$word.Visible = $False 
$doc = $word.Documents.Open("$file") 
$title = $word.ActiveDocument.Name.Split( "\.",2).GetValue(0) + ".html"
$title = $title -replace " ", "_"
Write-Host $title


$path = $root_dir + "\htmlout\";
if(!(Test-Path $path))
{
  mkdir $path;
}
$path += $title
 # 10 is a magic number for save as website filtered 
 # https://msdn.microsoft.com/en-us/vba/word-vba/articles/wdsaveformat-enumeration-word
$default = [Type]::Missing
$doc.SaveAs([ref]$path,$wdFormatHTML, $default, $default, $default, $default, $default, $default, $default, $default, $default, 65001) 
# Set-Content $path -Encoding UTF8;rm 
$word.ActiveDocument.Close();
$word.Quit();
}
#done
#>


foreach ($dir in $(get-childitem -Directory))
{
# if it already doesn't have spaces, don't do anything to it
cd "$dir";
$dir_name = "";
if($dir.Name.Contains(" "))
{
 $dir_name = $dir.Name -replace " ", "_"
}
else
{
 $dir_name = $dir.Name
}
 $path = $root_dir +"\"+ $dir_name + "\htmlout\";
 #Write-Host "Removing: " $path;
 #Remove-Item $path -Force -Recurse
 Write-Host "Creating: " $path;
 try{mkdir $path}catch{}

foreach ($file in $(get-childitem -recurse *.doc*)) # had to also change to .doc in retrospect, should have used *.doc*
{
 Write-Host $file; 
 $word = New-Object -comobject Word.Application
 $word.Visible = $False 
 $doc = $word.Documents.Open("$file") 
 $title = $word.ActiveDocument.Name.Split( "\.",2).GetValue(0) + ".html"
 $title = $title -replace " ", "_";
 Write-Host $title

 $temp_path = $path + $title
 Write-Host "Writing File to : " $temp_path;
 #$path = $title;
 # encode as UTF-8
 Remove-Item $temp_path
 $doc.SaveAs([ref]$temp_path,10, $default, $default, $default, $default, $default, $default, $default, $default, $default, 65001); # See comment above

 try{$doc.Close();}catch{}
}
cd ..
}

# in the event that you have to kill the script, run this:
#get-process | Where-Object Name -Like "*Word*" | kill
# 