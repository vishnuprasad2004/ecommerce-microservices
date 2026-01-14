// import { Request, Response } from "express";
// import { db } from "../db.js";
// import { billingInfo } from "../schema.js";
// import { eq } from "drizzle-orm";



// /**
//  * Fetch all the billing Information records for a user by ID
//  * GET /users/:userId/billing 
//  */
// export const getBillingInfoForUserById = async (req:Request, res:Response) => {
//   try {
//     const userId = req.params.userId as string;

//     const userBillingInfo = await db
//       .select()
//       .from(billingInfo)
//       .where(eq(billingInfo.userId, userId));

//     res.status(200).json({
//       message: userBillingInfo.length == 0 ? "No billing Information Available": "Billing Information Fetched",
//       status: "success",
//       data: userBillingInfo
//     });

//   } catch (error:any) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
//   }
// };

// /**
//  * Add new billing Information record for a user by ID
//  * POST /users/:userId/billing 
//  */
// export const addBillingInfoForUserById = (req:Request, res:Response) => {
//   try {
//     const {} = req.body;
//   } catch (error:any) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
//   }
// };

// /**
//  * Delete billing Information record by ID for a user by ID
//  * DELETE /users/:userId/billing/:billingId 
//  */
// export const deleteBillingInfoForUserById = (req:Request, res:Response) => {
//   try {
//     // TODO
//   } catch (error:any) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
//   }
// };


