import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { differenceInBusinessDays, parseISO } from 'date-fns';
import { applyLeave, getLeaveTypes } from '../api/leave.js';
import Header from '../components/layout/Header.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import useToast from '../hooks/useToast.js';

const schema = z
  .object({
    leaveTypeId: z.string().min(1, 'Please select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z
      .string()
      .min(10, 'Please provide a reason (minimum 10 characters)')
      .max(500, 'Reason too long'),
    halfDay: z.boolean().optional(),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

const ApplyLeavePage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [calculatedDays, setCalculatedDays] = useState(0);

  const { data: typesData } = useQuery({ queryKey: ['leave', 'types'], queryFn: getLeaveTypes });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  useEffect(() => {
    if (startDate && endDate) {
      try {
        const days = differenceInBusinessDays(parseISO(endDate), parseISO(startDate)) + 1;
        setCalculatedDays(Math.max(0, days));
      } catch {
        setCalculatedDays(0);
      }
    }
  }, [startDate, endDate]);

  const mutation = useMutation({
    mutationFn: applyLeave,
    onSuccess: () => {
      toast.success('Leave application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      navigate('/leave');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to apply for leave'),
  });

  const leaveTypes = typesData?.data || [];
  const typeOptions = leaveTypes.map((t) => ({
    value: t.id,
    label: `${t.name} (${t.totalDays} days/year)`,
  }));

  return (
    <div>
      <Header title="Apply for Leave" showBack />
      <div className="p-4 space-y-4">
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <Select
            label="Leave Type"
            required
            placeholder="Select leave type"
            options={typeOptions}
            error={errors.leaveTypeId?.message}
            {...register('leaveTypeId')}
          />

          <Input
            label="Start Date"
            type="date"
            required
            error={errors.startDate?.message}
            min={new Date().toISOString().split('T')[0]}
            {...register('startDate')}
          />

          <Input
            label="End Date"
            type="date"
            required
            error={errors.endDate?.message}
            min={startDate || new Date().toISOString().split('T')[0]}
            {...register('endDate')}
          />

          {calculatedDays > 0 && (
            <Card className="bg-indigo-50 border border-indigo-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-indigo-700">Total Working Days</span>
                <span className="text-xl font-bold text-indigo-600">{calculatedDays}</span>
              </div>
            </Card>
          )}

          <Textarea
            label="Reason"
            required
            placeholder="Please provide a reason for your leave (minimum 10 characters)..."
            rows={4}
            error={errors.reason?.message}
            {...register('reason')}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="full"
              onClick={() => navigate('/leave')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="full"
              loading={mutation.isPending || isSubmitting}
              className="flex-1"
            >
              Submit Application
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyLeavePage;
