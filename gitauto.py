import os
import subprocess
from datetime import datetime

class DirectoryScanner:
    def __init__(self):
        self.scanned_dirs = []

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

    def generate_scripts(self, directory):
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

    def scan_directory(self, root_dir, skip_dirs):
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Remove directories to skip
            for skip_dir in skip_dirs.get('skip_whole', []):
                if skip_dir in dirnames:
                    dirnames.remove(skip_dir)

            for filename in filenames:
                file_path = os.path.join(dirpath, filename)

            for dirname in dirnames:
                subdir = os.path.join(dirpath, dirname)

                # Skip directories based on skip_start and skip_end rules
                for skip_dir in skip_dirs.get('skip_start', []):
                    if subdir.startswith(os.path.join(root_dir, skip_dir)):
                        continue

                for skip_dir in skip_dirs.get('skip_end', []):
                    if subdir.endswith(skip_dir):
                        continue

                # Check if the directory has already been scanned to avoid duplicates
                if subdir in self.scanned_dirs:
                    self.print_warn(f"Skip: {subdir}")
                    continue

                git_dir = os.path.join(subdir, '.git')
                if os.path.isdir(git_dir):
                    self.generate_scripts(subdir)
                    self.scanned_dirs.append(subdir)  # Add the directory to the scanned set
                    self.print_info(f"Git-Directory: {subdir}")
                    os.chdir(subdir)
                    self.git_commit_and_push(subdir)
                    os.chdir(root_dir)

# Specify directories to skip
skip_dirs = {
    'skip_whole': ['node_modules', '.git'],
    'skip_start': ['.'],
    'skip_end': []
}

# Specify the root directory to scan
root_directory = os.getcwd()

# Create an instance of DirectoryScanner
scanner = DirectoryScanner()

# Perform the scan
scanner.scan_directory(root_directory, skip_dirs)
