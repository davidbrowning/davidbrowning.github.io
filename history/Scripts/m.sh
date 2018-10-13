files=$(find ../ -iname "*.html")
for i in $files[*]; do echo "<a href="$i">$i</a>"; printf '<br>'; done > test.html
