for file in "$(ls *)"; do mv "$file" `echo $file | tr   _` ; done
