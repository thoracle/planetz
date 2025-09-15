#!/usr/bin/env python3
"""Script to clean up spammy debug messages in PlanetZ codebase."""

import os
import re
from pathlib import Path
import argparse


class DebugCleaner:
    def __init__(self, dry_run=True):
        self.dry_run = dry_run
        self.stats = {
            'files_processed': 0,
            'debug_calls_removed': 0,
            'debug_calls_kept': 0,
            'commented_debug_removed': 0,
            'console_log_removed': 0
        }
        
        # Patterns for different types of spammy debug messages
        self.patterns = {
            # Commented out debug calls
            'commented_debug': re.compile(r'^\s*//\s*debug\(.*?\);?\s*$', re.MULTILINE),
            
            # Console.log statements (often used for debugging)
            'console_log': re.compile(r'^\s*console\.log\(.*?\);\s*$', re.MULTILINE),
            
            # Spammy debug patterns (high frequency, low value)
            'spammy_debug': [
                # Position/coordinate spam
                re.compile(r'debug\([\'"].*?[\'"],\s*[\'"].*?position.*?[\'"].*?\);?', re.IGNORECASE),
                re.compile(r'debug\([\'"].*?[\'"],\s*[\'"].*?coordinate.*?[\'"].*?\);?', re.IGNORECASE),
                
                # Frequent update spam
                re.compile(r'debug\([\'"].*?[\'"],\s*[\'"].*?update.*?[\'"].*?\);?', re.IGNORECASE),
                re.compile(r'debug\([\'"].*?[\'"],\s*[\'"].*?tick.*?[\'"].*?\);?', re.IGNORECASE),
                
                # Loop iteration spam
                re.compile(r'debug\([\'"].*?[\'"],\s*[\'"].*?iteration.*?[\'"].*?\);?', re.IGNORECASE),
                re.compile(r'debug\([\'"].*?[\'"],\s*[\'"].*?processing.*?[\'"].*?\);?', re.IGNORECASE),
                
                # Verbose state spam
                re.compile(r'debug\([\'"].*?[\'"],\s*[\'"].*?state:.*?[\'"].*?\);?', re.IGNORECASE),
            ]
        }
        
        # Debug calls to keep (important for debugging)
        self.keep_patterns = [
            # Error conditions
            re.compile(r'debug\([\'"].*?[\'"],\s*[\'"].*?(error|fail|exception).*?[\'"]', re.IGNORECASE),
            
            # Critical system events
            re.compile(r'debug\([\'"]P1[\'"]', re.IGNORECASE),
            
            # Important state changes
            re.compile(r'debug\([\'"].*?[\'"],\s*[\'"].*?(initialized|started|stopped|completed).*?[\'"]', re.IGNORECASE),
            
            # User actions
            re.compile(r'debug\([\'"].*?[\'"],\s*[\'"].*?(clicked|pressed|selected).*?[\'"]', re.IGNORECASE),
        ]
    
    def should_keep_debug(self, line):
        """Check if a debug call should be kept."""
        for pattern in self.keep_patterns:
            if pattern.search(line):
                return True
        return False
    
    def is_spammy_debug(self, line):
        """Check if a debug call is spammy."""
        for pattern in self.patterns['spammy_debug']:
            if pattern.search(line):
                return True
        return False
    
    def clean_file(self, file_path):
        """Clean debug messages from a single file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            lines_removed = 0
            
            # Remove commented debug calls
            commented_matches = self.patterns['commented_debug'].findall(content)
            if commented_matches:
                content = self.patterns['commented_debug'].sub('', content)
                lines_removed += len(commented_matches)
                self.stats['commented_debug_removed'] += len(commented_matches)
            
            # Remove console.log statements (but be careful not to remove important ones)
            console_matches = self.patterns['console_log'].findall(content)
            for match in console_matches:
                if 'error' not in match.lower() and 'warn' not in match.lower():
                    content = content.replace(match, '')
                    lines_removed += 1
                    self.stats['console_log_removed'] += 1
            
            # Process debug calls line by line for more control
            lines = content.split('\n')
            cleaned_lines = []
            
            for line in lines:
                if 'debug(' in line:
                    if self.should_keep_debug(line):
                        cleaned_lines.append(line)
                        self.stats['debug_calls_kept'] += 1
                    elif self.is_spammy_debug(line):
                        # Remove spammy debug call
                        self.stats['debug_calls_removed'] += 1
                        lines_removed += 1
                    else:
                        # Keep non-spammy debug calls
                        cleaned_lines.append(line)
                        self.stats['debug_calls_kept'] += 1
                else:
                    cleaned_lines.append(line)
            
            # Rejoin content
            content = '\n'.join(cleaned_lines)
            
            # Remove excessive blank lines
            content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
            
            if content != original_content:
                if not self.dry_run:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                
                print(f"{'[DRY RUN] ' if self.dry_run else ''}Cleaned {file_path}: {lines_removed} lines removed")
                return True
            
            return False
            
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            return False
    
    def clean_directory(self, directory):
        """Clean debug messages from all JavaScript files in directory."""
        js_files = list(Path(directory).rglob('*.js'))
        
        print(f"Found {len(js_files)} JavaScript files to process...")
        
        files_changed = 0
        for file_path in js_files:
            # Skip certain directories
            if any(skip in str(file_path) for skip in ['node_modules', '.git', 'dist', 'build']):
                continue
            
            if self.clean_file(file_path):
                files_changed += 1
            
            self.stats['files_processed'] += 1
        
        return files_changed
    
    def print_stats(self):
        """Print cleanup statistics."""
        print("\n" + "="*50)
        print("DEBUG CLEANUP STATISTICS")
        print("="*50)
        print(f"Files processed: {self.stats['files_processed']}")
        print(f"Debug calls removed: {self.stats['debug_calls_removed']}")
        print(f"Debug calls kept: {self.stats['debug_calls_kept']}")
        print(f"Commented debug removed: {self.stats['commented_debug_removed']}")
        print(f"Console.log removed: {self.stats['console_log_removed']}")
        print(f"Total cleanup actions: {sum(self.stats.values()) - self.stats['files_processed'] - self.stats['debug_calls_kept']}")


def main():
    parser = argparse.ArgumentParser(description='Clean up spammy debug messages')
    parser.add_argument('--directory', '-d', default='frontend/static/js',
                       help='Directory to clean (default: frontend/static/js)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be cleaned without making changes')
    parser.add_argument('--execute', action='store_true',
                       help='Actually perform the cleanup (removes --dry-run)')
    
    args = parser.parse_args()
    
    # Default to dry run unless --execute is specified
    dry_run = not args.execute
    
    if dry_run:
        print("🔍 DRY RUN MODE - No files will be modified")
        print("Use --execute to actually perform cleanup")
    else:
        print("⚠️  EXECUTE MODE - Files will be modified!")
        response = input("Are you sure you want to proceed? (y/N): ")
        if response.lower() != 'y':
            print("Cleanup cancelled.")
            return
    
    print(f"\n🧹 Starting debug cleanup in: {args.directory}")
    
    cleaner = DebugCleaner(dry_run=dry_run)
    files_changed = cleaner.clean_directory(args.directory)
    
    cleaner.print_stats()
    
    if dry_run:
        print(f"\n🔍 DRY RUN: {files_changed} files would be modified")
        print("Run with --execute to perform actual cleanup")
    else:
        print(f"\n✅ CLEANUP COMPLETE: {files_changed} files modified")


if __name__ == "__main__":
    main()
