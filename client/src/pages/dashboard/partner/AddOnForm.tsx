
import { FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuthService } from '@/services/auth';
import { AddOnFormPresenter } from '@/adapters/presenters/AddOnFormPresenter';

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  pricing: z.number().min(0, 'Price must be positive'),
  media: z.array(z.object({
    type: z.string(),
    url: z.string().url()
  }))
});

type FormData = z.infer<typeof formSchema>;

const AddOnForm: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthService();
  const navigate = useNavigate();
  const { toast } = useToast();
  const presenter = new AddOnFormPresenter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      pricing: 0,
      media: []
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      await presenter.createAddOn(data, user?.uid || '');
      toast({
        title: 'Success',
        description: 'Add-on created successfully'
      });
      navigate('/dashboard/partner/addons');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Name"
          {...form.register('name')}
          error={form.formState.errors.name?.message}
        />
        <Textarea
          label="Description"
          {...form.register('description')}
          error={form.formState.errors.description?.message}
        />
        <Select
          label="Category"
          {...form.register('category')}
          error={form.formState.errors.category?.message}
          options={[
            { value: 'equipment', label: 'Equipment' },
            { value: 'service', label: 'Service' },
            { value: 'experience', label: 'Experience' }
          ]}
        />
        <Input
          type="number"
          label="Price"
          {...form.register('pricing', { valueAsNumber: true })}
          error={form.formState.errors.pricing?.message}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Add-on'}
        </Button>
      </form>
    </Form>
  );
};

export default AddOnForm;
