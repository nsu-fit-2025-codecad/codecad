import React from 'react';
import { Button } from './ui/button';
import { useNestingStore } from '@/store/nesting-store';

interface SelectionModeToggleProps {
  className?: string;
}

export const SelectionModeToggle: React.FC<SelectionModeToggleProps> = ({ className }) => {
  const { selectionMode, setSelectionMode, clearSelection } = useNestingStore();
  
  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        variant={selectionMode === 'object' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSelectionMode('object')}
      >
        Выбор объектов
      </Button>
      <Button
        variant={selectionMode === 'area' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSelectionMode('area')}
      >
        Выбор области
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={clearSelection}
      >
        Сбросить
      </Button>
    </div>
  );
};