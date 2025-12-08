#!/bin/bash

input_dir="."
output_file="output.txt"

separator="*********************************************************************************************************************************************************************"

> "$output_file"

count=1

for file in "$input_dir"/*; do
    if [[ -f "$file" ]]; then
        filename="${file##*/}"
        underline=$(printf "%${#filename}s" "" | tr " " "*")

        echo "$separator" >> "$output_file"
        echo "File $count: $filename" >> "$output_file"
        echo "$underline" >> "$output_file"

        cat "$file" >> "$output_file"

        echo "$separator" >> "$output_file"
        count=$((count + 1))
    fi
done

echo "Done! Output saved to $output_file"

