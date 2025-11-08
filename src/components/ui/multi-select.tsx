"use client";

import * as React from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "./separator";

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  placeholder?: string;
  onValueChange?: (values: string[]) => void;
  defaultValues?: string[];
  disabled?: boolean;
}

export function MultiSelect({
  options,
  placeholder,
  onValueChange,
  defaultValues = [],
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(defaultValues);

  const handleSelect = (value: string) => {
    const isSelected = selected.includes(value);
    const newValues = isSelected
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    setSelected(newValues);
    onValueChange?.(newValues);
  };

  const handleClear = () => {
    setSelected([]);
    onValueChange?.([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between"
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder || "Select..."
              : selected.length === 1
              ? options.find(o => o.value === selected[0])?.label
              : `${selected.length} selected`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  onSelect={() => handleSelect(opt.value)}
                  className="flex items-center justify-between cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <span>{opt.label}</span>
                  {selected.includes(opt.value) && (
                    <Check className="h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {selected.length > 0 && (
              <>
                <Separator />
                <CommandGroup>
                    <CommandItem onSelect={handleClear} className="justify-center text-center cursor-pointer hover:bg-accent hover:text-accent-foreground">
                        Clear filters
                    </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}