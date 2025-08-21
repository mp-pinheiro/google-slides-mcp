import { z } from 'zod';

export const CreatePresentationArgsSchema = z.object({
  title: z.string().min(1, { message: '"title" (string) is required.' }),
});
export type CreatePresentationArgs = z.infer<typeof CreatePresentationArgsSchema>;

export const GetPresentationArgsSchema = z.object({
  presentationId: z.string().min(1, { message: '"presentationId" (string) is required.' }),
  fields: z.string().optional(),
});
export type GetPresentationArgs = z.infer<typeof GetPresentationArgsSchema>;

// Using z.any() for complex Google Slides API structures for simplicity in this context.
// For stricter typing, these could be defined more precisely based on the Google Slides API.
const GoogleSlidesRequestSchema = z.any();
const GoogleSlidesWriteControlSchema = z.any();

export const BatchUpdatePresentationArgsSchema = z.object({
  presentationId: z.string().min(1, { message: '"presentationId" (string) is required.' }),
  requests: z.array(GoogleSlidesRequestSchema).min(1, { message: '"requests" (array) is required.' }),
  writeControl: GoogleSlidesWriteControlSchema.optional(),
});
export type BatchUpdatePresentationArgs = z.infer<typeof BatchUpdatePresentationArgsSchema>;

export const GetPageArgsSchema = z.object({
  presentationId: z.string().min(1, { message: '"presentationId" (string) is required.' }),
  pageObjectId: z.string().min(1, { message: '"pageObjectId" (string) is required.' }),
});
export type GetPageArgs = z.infer<typeof GetPageArgsSchema>;

export const SummarizePresentationArgsSchema = z.object({
  presentationId: z.string().min(1, { message: '"presentationId" (string) is required.' }),
  include_notes: z.boolean().optional(),
});
export type SummarizePresentationArgs = z.infer<typeof SummarizePresentationArgsSchema>;

export const CreateSlideWithContentArgsSchema = z.object({
  presentationId: z.string().min(1, { message: '"presentationId" (string) is required.' }),
  title: z.string().min(1, { message: '"title" (string) is required.' }),
  content: z.string().min(1, { message: '"content" (string) is required.' }),
  slideIndex: z.number().int().min(0).optional(),
  layout: z.enum(['TITLE_AND_BODY', 'TITLE_ONLY', 'BLANK']).optional(),
});
export type CreateSlideWithContentArgs = z.infer<typeof CreateSlideWithContentArgsSchema>;

export const AddTextToSlideArgsSchema = z.object({
  presentationId: z.string().min(1, { message: '"presentationId" (string) is required.' }),
  slideId: z.string().min(1, { message: '"slideId" (string) is required.' }),
  text: z.string().min(1, { message: '"text" (string) is required.' }),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fontSize: z.number().min(8).max(72).optional(),
  autoFitText: z.boolean().optional(),
  textType: z.enum(['TITLE', 'BODY', 'CAPTION']).optional(),
});
export type AddTextToSlideArgs = z.infer<typeof AddTextToSlideArgsSchema>;

export const AddListToSlideArgsSchema = z.object({
  presentationId: z.string().min(1, { message: '"presentationId" (string) is required.' }),
  slideId: z.string().min(1, { message: '"slideId" (string) is required.' }),
  listContent: z.string().min(1, { message: '"listContent" (string) is required.' }),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  bulletStyle: z
    .enum([
      'BULLET_DISC_CIRCLE_SQUARE',
      'BULLET_CIRCLE_HOLLOW',
      'BULLET_DIAMOND_X',
      'NUMBERED_DECIMAL',
      'NUMBERED_ALPHA_LOWER',
    ])
    .optional(),
});
export type AddListToSlideArgs = z.infer<typeof AddListToSlideArgsSchema>;

export const AddTableToSlideArgsSchema = z.object({
  presentationId: z.string().min(1, { message: '"presentationId" (string) is required.' }),
  slideId: z.string().min(1, { message: '"slideId" (string) is required.' }),
  tableContent: z.string().min(1, { message: '"tableContent" (string) is required.' }),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  headerStyle: z.boolean().optional(),
});
export type AddTableToSlideArgs = z.infer<typeof AddTableToSlideArgsSchema>;
