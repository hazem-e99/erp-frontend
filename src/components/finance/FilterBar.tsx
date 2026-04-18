"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";

interface FilterField {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "dateRange" | "number";
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  fields: FilterField[];
  onFilterChange: (filters: Record<string, any>) => void;
  onClear: () => void;
}

export function FilterBar({ fields, onFilterChange, onClear }: FilterBarProps) {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClear = () => {
    setFilters({});
    onClear();
  };

  const hasActiveFilters = Object.values(filters).some(v => v && v !== '');

  return (
    <Card className="mb-4">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Filters</h3>
            {hasActiveFilters && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {Object.values(filters).filter(v => v && v !== '').length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 text-xs"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Filter Fields */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {field.label}
                </label>

                {field.type === "text" && (
                  <Input
                    type="text"
                    placeholder={field.placeholder || `Search ${field.label.toLowerCase()}...`}
                    value={filters[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="h-9 text-sm"
                  />
                )}

                {field.type === "select" && (
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={filters[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  >
                    <option value="">All</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === "date" && (
                  <Input
                    type="date"
                    value={filters[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="h-9 text-sm"
                  />
                )}

                {field.type === "dateRange" && (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={filters[`${field.key}From`] || ""}
                      onChange={(e) => handleChange(`${field.key}From`, e.target.value)}
                      className="h-9 text-sm flex-1"
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={filters[`${field.key}To`] || ""}
                      onChange={(e) => handleChange(`${field.key}To`, e.target.value)}
                      className="h-9 text-sm flex-1"
                    />
                  </div>
                )}

                {field.type === "number" && (
                  <Input
                    type="number"
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    value={filters[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="h-9 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
