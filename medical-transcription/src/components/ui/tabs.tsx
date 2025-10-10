import * as React from 'react'

interface TabsContextValue {
	value: string
	setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
	defaultValue: string
}

export function Tabs({ defaultValue, className = '', children, ...props }: TabsProps) {
	const [value, setValue] = React.useState(defaultValue)
	return (
		<TabsContext.Provider value={{ value, setValue }}>
			<div className={`w-full ${className}`} {...props}>
				{children}
			</div>
		</TabsContext.Provider>
	)
}

export function TabsList({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
			{...props}
		/>
	)
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	value: string
}

export function TabsTrigger({ className = '', value, ...props }: TabsTriggerProps) {
	const ctx = React.useContext(TabsContext)
	if (!ctx) return null
	const selected = ctx.value === value
	return (
		<button
			type="button"
			onClick={() => ctx.setValue(value)}
			className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow ${
				selected ? 'bg-background text-foreground shadow' : ''
			} ${className}`}
			data-state={selected ? 'active' : 'inactive'}
			{...props}
		/>
	)
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
	value: string
}

export function TabsContent({ className = '', value, children, ...props }: TabsContentProps) {
	const ctx = React.useContext(TabsContext)
	if (!ctx) return null
	const selected = ctx.value === value
	if (!selected) return null
	return (
		<div className={`mt-2 ${className}`} {...props}>
			{children}
		</div>
	)
}




