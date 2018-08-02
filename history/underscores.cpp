#include<iostream>
#include<vector>
#include<regex>

const std::regex spaces(" ");

void remove_spaces(std::string &s) 
{
  // what is likely a horrible attempt to rename spaces to underscores recursively
  //  basically, creates a bash script that creates the necessary directories 
  //  and then renames the files find found
  // $ find . -iname "*.txt" -exec ./underscore.out {} \; >mover.sh
  std::cout << "mkdir -p `dirname " << std::regex_replace(s, spaces, "_") << '`' << std::endl;
  std::cout <<"mv " << std::regex_replace(s,spaces,"\\ ") << " " <<  std::regex_replace(s, spaces, "_") << std::endl; 
}

int main(int argc, char *pArgv[])
{
  std::string in(pArgv[1]);
  remove_spaces(in);
  return EXIT_SUCCESS;
}

