import { FC, useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { useAuthService } from '@/services/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PartnerSidebar } from '@/components/layout/PartnerSidebar';
import { AddOnFormPresenter } from '@/adapters/presenters/AddOnFormPresenter';
import { useAddOnService } from '@/hooks/partner/useAddOnService';

const ADDON_CATEGORIES = [
  'Fishing Equipment',
  'Water Sports',
  'Catering',
  'Entertainment',
  'Tour Guide',
  'Photography'
];

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  pricing: z.number().min(0, 'Price must be positive'),
});

const AddOnForm: FC = () => {
  const [, navigate] = useLocation();
  const { user } = useAuthService();
  const addOnService = useAddOnService();
  const [media, setMedia] = useState<{ type: string; url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      pricing: 0,
    },
  });

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (!user?.uid) {
        toast({ title: 'Error', description: 'User not authenticated' });
        return;
      }

      if (media.length === 0) {
        toast({ title: 'Error', description: 'At least one media item is required' });
        return;
      }

      const result = await addOnService.createAddOn({
        ...data,
        media,
        partnerId: user.uid,
      });

      if (result) {
        toast({ title: 'Success', description: 'Service added successfully' });
        navigate('/dashboard/partner');
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to create service' 
      });
    }
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await addOnService.uploadMedia(file);
      setMedia([...media, result]);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to upload media' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  return (
    <DashboardLayout sidebar={<PartnerSidebar />}>
      <AddOnFormPresenter
        onSubmit={form.handleSubmit(handleSubmit)}
        formSchema={form}
        media={media}
        removeMedia={removeMedia}
        handleMediaSelect={handleMediaSelect}
        isUploading={isUploading}
        ADDON_CATEGORIES={ADDON_CATEGORIES}
      />
    </DashboardLayout>
  );
};

export default AddOnForm;