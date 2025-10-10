import * as React from 'react'

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
	orientation?: 'horizontal' | 'vertical'
}

export function Separator({
	className = '',
	orientation = 'horizontal',
	...props
}: SeparatorProps) {
	if (orientation === 'vertical') {
		return (
			<div
				role="separator"
				aria-orientation="vertical"
				className={`h-full w-px bg-border ${className}`}
				{...props}
			/>
		)
	}
	return (
		<div role="separator" className={`w-full h-px bg-border ${className}`} {...props} />
	)
}




