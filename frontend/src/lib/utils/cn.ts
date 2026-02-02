import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * Handles conditional classes, array inputs, and resolves conflicts
 * 
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary-500', 'hover:bg-primary-600')
 * cn('text-sm', { 'font-bold': isBold, 'text-error': hasError })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
