import { Controller, Get, Query } from '@nestjs/common';
import { ProjectionsService } from './projections.service';
import {
  LineupInsights,
  LineupInsightsQuery,
  ProjectedPlayer,
  ProjectionQuery,
} from './projections.models';

@Controller()
export class ProjectionsController {
  constructor(private readonly projectionsService: ProjectionsService) {}

  @Get('projections')
  getProjections(@Query() query: ProjectionQuery): Promise<ProjectedPlayer[]> {
    return this.projectionsService.getProjections(query);
  }

  @Get('lineup-insights')
  getLineupInsights(@Query() query: LineupInsightsQuery): Promise<LineupInsights> {
    return this.projectionsService.getLineupInsights(query);
  }
}
