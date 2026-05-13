import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import { commitProductsImport, previewProductsImport } from "./import";
import {
  bulkArchiveProducts,
  bulkSetProductsActive,
  createProduct,
  deleteProduct,
  setProductActive,
  updateProduct,
} from "./mutations";
import {
  commitProductsImportInput,
  exportProductsInput,
  listProductsInput,
  productBulkArchiveSchema,
  productBulkSetActiveSchema,
  productDeleteSchema,
  productMutationSchema,
  productSetActiveSchema,
  productUpdateSchema,
  previewProductsImportInput,
} from "./schemas";
import { exportProducts, listProducts } from "./queries";

export const productsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listProductsInput)
    .query(async ({ ctx, input }) => listProducts(ctx, input)),
  exportRows: protectedProcedure
    .input(exportProductsInput)
    .query(async ({ ctx, input }) => exportProducts(ctx, input)),
  previewImport: protectedProcedure
    .input(previewProductsImportInput)
    .mutation(async ({ ctx, input }) => previewProductsImport(ctx, input)),
  commitImport: protectedProcedure
    .input(commitProductsImportInput)
    .mutation(async ({ ctx, input }) => commitProductsImport(ctx, input)),
  create: protectedProcedure
    .input(productMutationSchema)
    .mutation(async ({ ctx, input }) => createProduct(ctx, input)),
  update: protectedProcedure
    .input(productUpdateSchema)
    .mutation(async ({ ctx, input }) => updateProduct(ctx, input)),
  setActive: protectedProcedure
    .input(productSetActiveSchema)
    .mutation(async ({ ctx, input }) => setProductActive(ctx, input)),
  bulkSetActive: protectedProcedure
    .input(productBulkSetActiveSchema)
    .mutation(async ({ ctx, input }) => bulkSetProductsActive(ctx, input)),
  bulkArchive: protectedProcedure
    .input(productBulkArchiveSchema)
    .mutation(async ({ ctx, input }) => bulkArchiveProducts(ctx, input)),
  delete: protectedProcedure
    .input(productDeleteSchema)
    .mutation(async ({ ctx, input }) => deleteProduct(ctx, input)),
});
