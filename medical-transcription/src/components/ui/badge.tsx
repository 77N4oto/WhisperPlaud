import * as React from 'react'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: BadgeVariant
}

function variantClasses(variant: BadgeVariant): string {
	switch (variant) {
		case 'default':
			return 'bg-primary text-primary-foreground'
		case 'secondary':
			return 'bg-secondary text-secondary-foreground'
		case 'destructive':
			return 'bg-destructive text-destructive-foreground'
		case 'outline':
		default:
			return 'border border-input'
	}
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className = '', variant = 'default', ...props }, ref) => {
		return (
			<span
				ref={ref}
				className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses(
					variant
				)} ${className}`}
				{...props}
			/>
		)
	}
)
Badge.displayName = 'Badge'




