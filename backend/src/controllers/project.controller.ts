import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';

export const getAllProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        inventory: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { leads: true, campaigns: true, knowledge: true, inventory: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, projects);
  } catch (err: any) {
    return sendError(res, 'PROJECTS_FETCH_ERROR', err.message, 500);
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        inventory: { orderBy: { createdAt: 'asc' } },
        knowledge: { orderBy: { createdAt: 'desc' } },
        campaigns: { orderBy: { createdAt: 'desc' } },
        _count: { select: { leads: true, inventory: true } },
      },
    });

    if (!project) {
      return sendError(res, 'NOT_FOUND', 'Project not found', 404);
    }
    return sendSuccess(res, project);
  } catch (err: any) {
    return sendError(res, 'PROJECT_FETCH_ERROR', err.message, 500);
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      developer,
      location,
      fullAddress,
      googleMapsUrl,
      reraNumber,
      description,
      propertyType,
      configurations,
      priceMin,
      priceMax,
      amenities,
      possession,
      coverImageUrl,
      initialConfigurations,
    } = req.body;

    if (!name || !developer || !location) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Name, developer, and location are required',
        400
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        developer,
        location,
        fullAddress,
        googleMapsUrl,
        reraNumber,
        description,
        propertyType: propertyType || 'Residential Apartment',
        configurations: configurations || '',
        priceMin: priceMin ? parseFloat(priceMin) : null,
        priceMax: priceMax ? parseFloat(priceMax) : null,
        amenities,
        possession,
        coverImageUrl: coverImageUrl || null,
        inventory: initialConfigurations && Array.isArray(initialConfigurations) && initialConfigurations.length > 0
          ? {
              create: initialConfigurations.map((cfg: any) => ({
                type: cfg.type,
                carpetAreaSqft: parseInt(cfg.carpetAreaSqft) || 1000,
                builtUpAreaSqft: cfg.builtUpAreaSqft ? parseInt(cfg.builtUpAreaSqft) : null,
                startingPrice: parseFloat(cfg.startingPrice) || 0,
                maxPrice: cfg.maxPrice ? parseFloat(cfg.maxPrice) : null,
                priceDisplay: cfg.priceDisplay || `₹${(parseFloat(cfg.startingPrice || 0) / 10000000).toFixed(2)} Cr`,
                pricePerSqft: cfg.pricePerSqft ? parseFloat(cfg.pricePerSqft) : null,
                bathrooms: parseInt(cfg.bathrooms) || 2,
                balconies: parseInt(cfg.balconies) || 1,
                parkingSpaces: cfg.parkingSpaces || '1 Covered',
                facing: cfg.facing,
                floorRange: cfg.floorRange,
                availabilityStatus: cfg.availabilityStatus || 'AVAILABLE',
                floorPlanUrl: cfg.floorPlanUrl,
              })),
            }
          : undefined,
      },
      include: {
        inventory: true,
      },
    });

    return sendSuccess(res, project, 'Project created successfully', 201);
  } catch (err: any) {
    return sendError(res, 'PROJECT_CREATE_ERROR', err.message, 500);
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      developer,
      location,
      fullAddress,
      googleMapsUrl,
      reraNumber,
      description,
      propertyType,
      configurations,
      priceMin,
      priceMax,
      amenities,
      possession,
      coverImageUrl,
      status,
    } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (developer !== undefined) data.developer = developer;
    if (location !== undefined) data.location = location;
    if (fullAddress !== undefined) data.fullAddress = fullAddress;
    if (googleMapsUrl !== undefined) data.googleMapsUrl = googleMapsUrl;
    if (reraNumber !== undefined) data.reraNumber = reraNumber;
    if (description !== undefined) data.description = description;
    if (propertyType !== undefined) data.propertyType = propertyType;
    if (configurations !== undefined) data.configurations = configurations;
    if (priceMin !== undefined) data.priceMin = priceMin ? parseFloat(priceMin) : null;
    if (priceMax !== undefined) data.priceMax = priceMax ? parseFloat(priceMax) : null;
    if (amenities !== undefined) data.amenities = amenities;
    if (possession !== undefined) data.possession = possession;
    if (coverImageUrl !== undefined) data.coverImageUrl = coverImageUrl;
    if (status !== undefined) data.status = status;

    const project = await prisma.project.update({
      where: { id },
      data,
      include: {
        inventory: { orderBy: { createdAt: 'asc' } },
        _count: {
          select: { leads: true, campaigns: true, knowledge: true, inventory: true },
        },
      },
    });
    return sendSuccess(res, project, 'Project updated successfully');
  } catch (err: any) {
    return sendError(res, 'PROJECT_UPDATE_ERROR', err.message, 500);
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Clean up all related items safely
    await prisma.followUp.deleteMany({
      where: { lead: { projectId: id } },
    });
    await prisma.aIAnalysis.deleteMany({
      where: { lead: { projectId: id } },
    });
    await prisma.message.deleteMany({
      where: { conversation: { lead: { projectId: id } } },
    });
    await prisma.conversation.deleteMany({
      where: { lead: { projectId: id } },
    });
    await prisma.lead.deleteMany({
      where: { projectId: id },
    });
    await prisma.campaign.deleteMany({
      where: { projectId: id },
    });
    await prisma.configuration.deleteMany({
      where: { projectId: id },
    });
    await prisma.projectKnowledge.deleteMany({
      where: { projectId: id },
    });
    await prisma.project.delete({
      where: { id },
    });

    return sendSuccess(res, { id }, 'Project and all associated inventory deleted successfully');
  } catch (err: any) {
    return sendError(res, 'PROJECT_DELETE_ERROR', err.message, 500);
  }
};

// ===================== CONFIGURATION MANAGEMENT =====================

export const normalizeRealEstatePrice = (
  rawPrice: number | string,
  explicitUnit?: 'CR' | 'LAKH' | 'RUPEES'
): { numericPrice: number; priceDisplay: string } => {
  const val = typeof rawPrice === 'string' ? parseFloat(rawPrice.trim().replace(/,/g, '')) : rawPrice;
  if (isNaN(val) || val <= 0) {
    return { numericPrice: 0, priceDisplay: 'Price on Request' };
  }

  let finalPrice = val;

  if (explicitUnit === 'CR') {
    finalPrice = Math.round(val * 10000000);
  } else if (explicitUnit === 'LAKH') {
    finalPrice = Math.round(val * 100000);
  } else if (explicitUnit === 'RUPEES') {
    finalPrice = Math.round(val);
  } else {
    // Smart auto-detection based on Indian real estate pricing norms:
    if (val < 25) {
      // E.g. 1.27, 2.5, 1.4, 3, etc. -> Crores
      finalPrice = Math.round(val * 10000000);
    } else if (val < 1000) {
      // E.g. 45, 60, 85, 95, 120 -> Lakhs
      finalPrice = Math.round(val * 100000);
    } else {
      // Full numeric rupees
      finalPrice = Math.round(val);
    }
  }

  let display = '';
  if (finalPrice >= 10000000) {
    const crVal = (finalPrice / 10000000).toFixed(2).replace(/\.00$/, '');
    display = `₹${crVal} Cr`;
  } else if (finalPrice >= 100000) {
    const lkVal = (finalPrice / 100000).toFixed(1).replace(/\.0$/, '');
    display = `₹${lkVal} Lakhs`;
  } else {
    display = `₹${finalPrice.toLocaleString('en-IN')}`;
  }

  return { numericPrice: finalPrice, priceDisplay: display };
};

export const addConfiguration = async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const {
      type,
      carpetAreaSqft,
      builtUpAreaSqft,
      startingPrice,
      priceUnit,
      maxPrice,
      priceDisplay,
      pricePerSqft,
      bathrooms,
      balconies,
      parkingSpaces,
      facing,
      floorRange,
      availabilityStatus,
      floorPlanUrl,
    } = req.body;

    if (!type || !carpetAreaSqft || startingPrice === undefined) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Type (e.g. 3 BHK), carpet area (sq.ft.), and starting price are required',
        400
      );
    }

    const normalized = normalizeRealEstatePrice(startingPrice, priceUnit);
    const calculatedDisplay = priceDisplay || normalized.priceDisplay;
    const numericPrice = normalized.numericPrice;

    const configuration = await prisma.configuration.create({
      data: {
        projectId,
        type,
        carpetAreaSqft: parseInt(carpetAreaSqft),
        builtUpAreaSqft: builtUpAreaSqft ? parseInt(builtUpAreaSqft) : null,
        startingPrice: numericPrice,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        priceDisplay: calculatedDisplay,
        pricePerSqft: pricePerSqft ? parseFloat(pricePerSqft) : null,
        bathrooms: bathrooms !== undefined ? parseInt(bathrooms) : 2,
        balconies: balconies !== undefined ? parseInt(balconies) : 1,
        parkingSpaces: parkingSpaces || '1 Covered',
        facing,
        floorRange,
        availabilityStatus: availabilityStatus || 'AVAILABLE',
        floorPlanUrl,
        isActive: true,
      },
    });

    // Also sync project's summary configurations field and price bounds
    const allConfigs = await prisma.configuration.findMany({
      where: { projectId, isActive: true },
    });
    const configTypes = Array.from(new Set(allConfigs.map((c) => c.type))).join(', ');
    const prices = allConfigs.map((c) => c.startingPrice);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);

    await prisma.project.update({
      where: { id: projectId },
      data: {
        configurations: configTypes,
        priceMin: minP,
        priceMax: maxP,
      },
    });

    return sendSuccess(res, configuration, 'Configuration added successfully', 201);
  } catch (err: any) {
    return sendError(res, 'CONFIG_CREATE_ERROR', err.message, 500);
  }
};

export const deleteConfiguration = async (req: Request, res: Response) => {
  try {
    const { id: projectId, configId } = req.params;
    await prisma.configuration.delete({
      where: { id: configId },
    });

    // Update project summary
    const allConfigs = await prisma.configuration.findMany({
      where: { projectId, isActive: true },
    });
    const configTypes = allConfigs.length > 0
      ? Array.from(new Set(allConfigs.map((c) => c.type))).join(', ')
      : null;
    const prices = allConfigs.map((c) => c.startingPrice);
    const minP = prices.length > 0 ? Math.min(...prices) : null;
    const maxP = prices.length > 0 ? Math.max(...prices) : null;

    await prisma.project.update({
      where: { id: projectId },
      data: {
        configurations: configTypes,
        priceMin: minP,
        priceMax: maxP,
      },
    });

    return sendSuccess(res, { id: configId }, 'Configuration removed');
  } catch (err: any) {
    return sendError(res, 'CONFIG_DELETE_ERROR', err.message, 500);
  }
};

export const updateConfiguration = async (req: Request, res: Response) => {
  try {
    const { id: projectId, configId } = req.params;
    const {
      type,
      carpetAreaSqft,
      builtUpAreaSqft,
      startingPrice,
      priceUnit,
      maxPrice,
      priceDisplay,
      pricePerSqft,
      bathrooms,
      balconies,
      parkingSpaces,
      facing,
      floorRange,
      availabilityStatus,
      floorPlanUrl,
    } = req.body;

    const existing = await prisma.configuration.findUnique({
      where: { id: configId },
    });

    if (!existing) {
      return sendError(res, 'NOT_FOUND', 'Configuration not found', 404);
    }

    let finalPrice = existing.startingPrice;
    let finalDisplay = existing.priceDisplay;

    if (startingPrice !== undefined) {
      const normalized = normalizeRealEstatePrice(startingPrice, priceUnit);
      finalPrice = normalized.numericPrice;
      finalDisplay = priceDisplay || normalized.priceDisplay;
    }

    const updated = await prisma.configuration.update({
      where: { id: configId },
      data: {
        ...(type ? { type } : {}),
        ...(carpetAreaSqft !== undefined ? { carpetAreaSqft: parseInt(carpetAreaSqft) } : {}),
        ...(builtUpAreaSqft !== undefined ? { builtUpAreaSqft: builtUpAreaSqft ? parseInt(builtUpAreaSqft) : null } : {}),
        startingPrice: finalPrice,
        priceDisplay: finalDisplay,
        ...(maxPrice !== undefined ? { maxPrice: maxPrice ? parseFloat(maxPrice) : null } : {}),
        ...(pricePerSqft !== undefined ? { pricePerSqft: pricePerSqft ? parseFloat(pricePerSqft) : null } : {}),
        ...(bathrooms !== undefined ? { bathrooms: parseInt(bathrooms) } : {}),
        ...(balconies !== undefined ? { balconies: parseInt(balconies) } : {}),
        ...(parkingSpaces !== undefined ? { parkingSpaces } : {}),
        ...(facing !== undefined ? { facing } : {}),
        ...(floorRange !== undefined ? { floorRange } : {}),
        ...(availabilityStatus ? { availabilityStatus } : {}),
        ...(floorPlanUrl !== undefined ? { floorPlanUrl } : {}),
      },
    });

    // Update project summary
    const allConfigs = await prisma.configuration.findMany({
      where: { projectId, isActive: true },
    });
    const configTypes = allConfigs.length > 0
      ? Array.from(new Set(allConfigs.map((c) => c.type))).join(', ')
      : null;
    const prices = allConfigs.map((c) => c.startingPrice);
    const minP = prices.length > 0 ? Math.min(...prices) : null;
    const maxP = prices.length > 0 ? Math.max(...prices) : null;

    await prisma.project.update({
      where: { id: projectId },
      data: {
        configurations: configTypes,
        priceMin: minP,
        priceMax: maxP,
      },
    });

    return sendSuccess(res, updated, 'Configuration updated successfully');
  } catch (err: any) {
    return sendError(res, 'CONFIG_UPDATE_ERROR', err.message, 500);
  }
};

// ===================== KNOWLEDGE BASE FAQS =====================

export const addKnowledgeItem = async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { category, question, answer } = req.body;

    if (!question || !answer) {
      return sendError(res, 'VALIDATION_ERROR', 'Question and answer are required', 400);
    }

    const item = await prisma.projectKnowledge.create({
      data: {
        projectId,
        category: category || 'GENERAL',
        question,
        answer,
        isActive: true,
      },
    });

    return sendSuccess(res, item, 'Knowledge item added successfully', 201);
  } catch (err: any) {
    return sendError(res, 'KNOWLEDGE_CREATE_ERROR', err.message, 500);
  }
};

export const deleteKnowledgeItem = async (req: Request, res: Response) => {
  try {
    const { knowledgeId } = req.params;
    await prisma.projectKnowledge.delete({ where: { id: knowledgeId } });
    return sendSuccess(res, { id: knowledgeId }, 'Knowledge item deleted');
  } catch (err: any) {
    return sendError(res, 'KNOWLEDGE_DELETE_ERROR', err.message, 500);
  }
};


