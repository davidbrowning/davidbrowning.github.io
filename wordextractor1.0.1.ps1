
function done(){
  $word.ActiveDocument.Close();
  $word.Quit();
  write-host "Done"
  exit
  end
}

cd "C:\Users\Dave\Desktop\Grandma and Grandpa Browning\"


foreach ($file in $(get-childitem *.doc*)) # had to also change to .doc in retrospect, should have used *.doc*
{
 Write-Host $file; 


$word = New-Object -comobject Word.Application
$word.Visible = $False 
$doc = $word.Documents.Open("$file") 
$title = $word.ActiveDocument.Name.Split( "\.",2).GetValue(0) + ".html"
Write-Host $title
#done

$path = "C:\Users\Dave\Desktop\Grandma and Grandpa Browning\htmlout\";
mkdir $path
$path += $title
#$path = $title;
$doc.SaveAs([ref]$path,8);
#done
<#
$a =0;
foreach ($p in $paras)
{
  #Write-Host $a
  
  try{get-date($p.Range.Text) -ErrorAction SilentlyContinue;}catch{}

  if([string]::IsNullOrWhiteSpace($p.Range.Text))
  {
  }  
  elseif($?)
  {
     write-host "DATE: " $p.Range.Text;
  }
  else
  {
     write-host "CONTENT: " $p.Range.Text;
  }
    
  $a++;
}
#$doc.close();
#>
$word.ActiveDocument.Close();
}

done
