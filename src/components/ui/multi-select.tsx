"use client";

import * as React from "react";
import { X } from "lucide-react";
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
          {selected.length === 0
            ? placeholder || "Select..."
            : `${selected.length} selected`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  onSelect={() => handleSelect(opt.value)}
                >
                  <div
                    className={cn(
                      "mr-2 h-4 w-4 rounded-sm border border-primary",
                      selected.includes(opt.value)
                        ? "bg-primary"
                        : "opacity-50"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.map((v) => (
              <Badge
                key={v}
                variant="secondary"
                className="flex items-center gap-1 px-2"
              >
                {options.find(o => o.value === v)?.label || v}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleSelect(v)}
                />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs"
              onClick={handleClear}
            >
              Clear All
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
