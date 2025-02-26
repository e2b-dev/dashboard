'use client'

import { useEffect, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, buttonVariants } from '@/ui/primitives/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { Input } from '@/ui/primitives/input'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import HelpTooltip from '@/ui/help-tooltip'
import { useToast } from '@/lib/hooks/use-toast'
import { useRouter } from 'next/navigation'

const formSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain is required')
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
      'Please enter a valid domain (e.g. e2b.dev)'
    ),
})

type FormValues = z.infer<typeof formSchema>

interface InfraDomainFormProps {
  apiDomain?: string
  className?: string
}

export default function InfraDomainForm({
  apiDomain,
  className,
}: InfraDomainFormProps) {
  'use no memo'

  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      domain: apiDomain ?? process.env.NEXT_PUBLIC_DEFAULT_API_DOMAIN,
    },
  })

  useEffect(() => {
    form.reset({
      domain: apiDomain ?? process.env.NEXT_PUBLIC_DEFAULT_API_DOMAIN,
    })
  }, [apiDomain, form])

  const onSubmit = async (values: FormValues) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 150))
      const response = await fetch(`https://api.${values.domain}/health`)

      if (!response.ok) {
        throw new Error('Failed to verify API domain')
      }

      const res = await fetch(`/api/developer/domain`, {
        method: 'POST',
        body: JSON.stringify({ domain: values.domain }),
      })

      if (!res.ok) {
        throw new Error('Failed to update API domain')
      }

      startTransition(() => {
        router.refresh()
      })

      toast({
        title: 'Success',
        description: 'API domain verified and updated successfully',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          'Failed to verify API domain. Please check the URL and try again',
        variant: 'error',
      })
      return
    }
  }

  const handleResetToDefault = async () => {
    const res = await fetch(`/api/developer/domain`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      toast({
        title: 'Error',
        description: 'Failed to reset API domain',
        variant: 'error',
      })
      return
    }

    form.setValue('domain', process.env.NEXT_PUBLIC_DEFAULT_API_DOMAIN)

    startTransition(() => {
      router.refresh()
    })

    toast({
      title: 'Success',
      description: 'API domain reset to default successfully',
      variant: 'success',
    })
  }

  const canResetToDefault =
    form.watch('domain') !== process.env.NEXT_PUBLIC_DEFAULT_API_DOMAIN

  const isSaveDisabled =
    form.formState.isSubmitting ||
    !form.formState.isValid ||
    form.watch('domain') === apiDomain ||
    isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <div className="flex h-5 items-center gap-2">
                <FormLabel>Infrastructure Domain</FormLabel>
                <HelpTooltip>
                  This is the domain that hosts your E2B infrastructure.
                </HelpTooltip>
                <AnimatePresence mode="wait">
                  {canResetToDefault && (
                    <motion.button
                      initial={{ x: 5, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 5, opacity: 0 }}
                      transition={{
                        duration: 0.15,
                      }}
                      className={cn(
                        buttonVariants({
                          variant: 'accent',
                          size: 'sm',
                        }),
                        'ml-auto h-5 text-xs'
                      )}
                      type="button"
                      onClick={handleResetToDefault}
                      disabled={isPending}
                    >
                      Reset to Default
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center">
                <FormControl>
                  <Input
                    placeholder="e2b.dev"
                    className="bg-bg-100"
                    {...field}
                  />
                </FormControl>
                <Button
                  type="submit"
                  disabled={isSaveDisabled}
                  loading={form.formState.isSubmitting || isPending}
                  className="ml-2"
                  variant="outline"
                >
                  Set
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
