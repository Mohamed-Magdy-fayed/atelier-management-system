import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import { createProduct, deleteProduct, updateProduct } from "./mutations";
import {
  listProductsInput,
  productDeleteSchema,
  productMutationSchema,
  productUpdateSchema,
} from "./schemas";
import { listProducts } from "./queries";

export const productsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listProductsInput)
    .query(async ({ ctx, input }) => listProducts(ctx, input)),
  create: protectedProcedure
    .input(productMutationSchema)
    .mutation(async ({ ctx, input }) => createProduct(ctx, input)),
  update: protectedProcedure
    .input(productUpdateSchema)
    .mutation(async ({ ctx, input }) => updateProduct(ctx, input)),
  delete: protectedProcedure
    .input(productDeleteSchema)
    .mutation(async ({ ctx, input }) => deleteProduct(ctx, input)),
});
