import os
import subprocess
from datetime import datetime

class DirectoryScanner:
    def __init__(self):
        self.scanned_dirs = []
        self.root_directory = os.getcwd()

    def print_error(self, text):
        print("\033[91m{}\033[00m".format(text))  # Print text in red color

    def print_info(self, text):
        print("\033[92m{}\033[00m".format(text))  # Print text in green color

    def print_warn(self, text):
        print("\033[94m{}\033[00m".format(text))  # Print text in blue color

    def git_commit_and_push(self, directory):
        # Execute Git operations
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        subprocess.run(["git", "add", "."])
        subprocess.run(["git", "commit", "-m", timestamp])
        push_process = subprocess.run(["git", "push", "--set-upstream", "origin", "master"], capture_output=True)
        # Print commit details
        self.print_info(f"Committed directory: {directory}")
        self.print_info(f"Commit timestamp: {timestamp}")

        # Check if there's any error during the push operation
        if push_process.returncode != 0:
            self.print_error("An error occurred during the push operation.")
            self.print_error(push_process.stderr.decode())
            # Open the directory with Explorer
            os.startfile(directory)

    def get_put_cmd_by_win(self):
        return """@echo off
setlocal
REM YYYY-MM-DD HH:MM:SS
for /f "delims=" %%a in ('wmic OS Get localdatetime ^| find "."') do set datetime=%%a
set "year=%datetime:~0,4%"
set "month=%datetime:~4,2%"
set "day=%datetime:~6,2%"
set "hour=%datetime:~8,2%"
set "minute=%datetime:~10,2%"
set "second=%datetime:~12,2%"
set "timestamp=%year%-%month%-%day% %hour%:%minute%:%second%"
REM git
git add .
git commit -m "%timestamp%"
git push --set-upstream origin master
endlocal
        """

    def get_put_cmd_by_linux(self):
        return """#!/bin/bash
timestamp=$(date +"%Y-%m-%d %H:%M:%S")
git add .
git commit -m "$timestamp"
git push --set-upstream origin master
        """

    def get_pull_cmd_by_win(self):
        return """@echo off
REM Git pull
git pull origin master
git diff --name-only --diff-filter=U
        """
    def get_pull_cmd_by_linux(self):
        return """#!/bin/bash
# Git pull
git pull origin master
git diff --name-only --diff-filter=U
        """
    def generate_autopython(self,destination_file):
        try:
            with open(__file__, 'r', encoding='utf-8') as source:
                content = source.read()
                with open(destination_file, 'w', encoding='utf-8') as dest:
                    dest.write(content)
            self.print_info("File copied successfully.")
        except FileNotFoundError:
            self.print_warn("Source file not found.")
        except Exception as e:
            self.print_error(f"An error occurred: {str(e)}")

    def generate_scripts(self, directory):
        # Check if gitput.bat exists
        gitput_bat_path = os.path.join(directory, "gitauto.py")
        if not os.path.exists(gitput_bat_path):
            self.generate_autopython(gitput_bat_path)
        else:
            self.print_info(f"{directory} gitauto.py already exists. Skipping generation.")
        # Check if gitput.bat exists
        gitput_bat_path = os.path.join(directory, "gitput.bat")
        if not os.path.exists(gitput_bat_path):
            with open(gitput_bat_path, "w") as bat_file:
                bat_file.write(self.get_put_cmd_by_win())
        else:
            self.print_info(f"{directory} gitput.bat already exists. Skipping generation.")

        # Check if gitput.sh exists
        gitput_sh_path = os.path.join(directory, "gitput.sh")
        if not os.path.exists(gitput_sh_path):
            with open(gitput_sh_path, "w") as sh_file:
                sh_file.write(self.get_put_cmd_by_linux())
        else:
            self.print_info(f"{directory} gitput.sh already exists. Skipping generation.")

        gitput_bat_path = os.path.join(directory, "gitpull.bat")
        if not os.path.exists(gitput_bat_path):
            with open(gitput_bat_path, "w") as bat_file:
                bat_file.write(self.get_pull_cmd_by_win())
        else:
            self.print_info(f"{directory} gitpull.bat already exists. Skipping generation.")
        gitput_bat_path = os.path.join(directory, "gitpull.sh")
        if not os.path.exists(gitput_bat_path):
            with open(gitput_bat_path, "w") as bat_file:
                bat_file.write(self.get_pull_cmd_by_linux())
        else:
            self.print_info(f"{directory} gitpull.sh already exists. Skipping generation.")

    def scan_directory(self,root_directory=None, skip_dirs={}):
        if root_directory==None:
            root_directory = self.root_directory

        def not_skip(directory):
            if directory in skip_dirs.get('skip_whole', []):
                return False
            for skip_dir in skip_dirs.get('skip_start', []):
                if directory.startswith(os.path.join(root_directory, skip_dir)):
                    return False
            for skip_dir in skip_dirs.get('skip_end', []):
                if directory.endswith(skip_dir):
                    return False
            return True
        
        for item in os.listdir(root_directory):
            item_path = os.path.join(root_directory, item)
            if os.path.isdir(item_path):
                if not_skip(item):
                    git_dir = os.path.join(item_path, '.git')
                    if os.path.isdir(git_dir):
                        self.print_info(f"is git:{item_path}")
                        self.git_commmit_directory(item_path)
                    self.scan_directory(item_path,skip_dirs)
            else:
                pass
        
    def git_commmit_directory(self, directory):
        self.generate_scripts(directory)
        self.print_info(f"Git-Directory: {directory}")
        os.chdir(directory)
        self.git_commit_and_push(directory)
        os.chdir(self.root_directory)

# Specify directories to skip
skip_dirs = {
    'skip_whole': ['node_modules', '.git'],
    'skip_start': ['.'],
    'skip_end': []
}

scanner = DirectoryScanner()

# Perform the scan
scanner.scan_directory( None,skip_dirs)
