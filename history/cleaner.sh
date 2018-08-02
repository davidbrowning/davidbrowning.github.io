LC_ALL=en_US.UTF-8 spaces=$(printf "%b" "\U00A0\U1680\U180E\U2000\U2001\U2002\U2003\U2004\U2005\U2006\U2007\U2008\U2009\U200A\U200B\U202F\U205F\U3000\UFEFF")

while read -r line; do
    echo "${line//[$spaces]/ }"
done
