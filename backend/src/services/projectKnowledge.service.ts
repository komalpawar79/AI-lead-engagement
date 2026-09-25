import prisma from '../prisma/client';
import { ProjectContext } from '../ai/prompts';

class ProjectKnowledgeService {
  /**
   * Fetch complete project context with its approved knowledge base items
   */
  public async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        inventory: {
          where: { isActive: true },
          orderBy: { startingPrice: 'asc' },
        },
        knowledge: {
          where: { isActive: true },
        },
      },
    });

    if (!project) return null;

    return {
      id: project.id,
      name: project.name,
      developer: project.developer,
      location: project.location,
      fullAddress: project.fullAddress,
      googleMapsUrl: project.googleMapsUrl,
      reraNumber: project.reraNumber,
      description: project.description,
      propertyType: project.propertyType,
      configurations: project.configurations,
      priceMin: project.priceMin,
      priceMax: project.priceMax,
      amenities: project.amenities,
      possession: project.possession,
      inventory: project.inventory.map((cfg) => ({
        id: cfg.id,
        type: cfg.type,
        carpetAreaSqft: cfg.carpetAreaSqft,
        startingPrice: cfg.startingPrice,
        priceDisplay: cfg.priceDisplay,
        bathrooms: cfg.bathrooms,
        balconies: cfg.balconies,
        parkingSpaces: cfg.parkingSpaces,
        facing: cfg.facing,
        availabilityStatus: cfg.availabilityStatus,
      })),
      knowledgeItems: project.knowledge.map((k) => ({
        category: k.category,
        question: k.question,
        answer: k.answer,
      })),
    };
  }
}

export const projectKnowledgeService = new ProjectKnowledgeService();
export default projectKnowledgeService;

